#!/usr/bin/env python3
"""Run isolated baseline/candidate sessions and preserve raw evaluation evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shlex
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parent.parent
CASES_PATH = ROOT / "evals/cases.yaml"
FIXTURE_BASE_REF = "refs/tags/eval-fixture-base"
DISABLED_FEATURES = (
    "apps",
    "multi_agent",
    "multi_agent_v2",
    "plugins",
    "skill_search",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", action="append", dest="case_ids")
    parser.add_argument("--mode", choices=("baseline", "candidate", "both"), default="both")
    parser.add_argument("--model", default="gpt-5.4")
    parser.add_argument("--reasoning-effort", default="medium")
    parser.add_argument("--results-dir", required=True, type=Path)
    parser.add_argument("--timeout-seconds", type=int, default=900)
    parser.add_argument("--append", action="store_true")
    return parser.parse_args()


def load_cases(selected_ids: list[str] | None) -> list[dict[str, Any]]:
    document = yaml.safe_load(CASES_PATH.read_text(encoding="utf-8"))
    cases = document["cases"]
    if not selected_ids:
        return cases

    by_id = {case["id"]: case for case in cases}
    unknown = sorted(set(selected_ids) - set(by_id))
    if unknown:
        raise SystemExit(f"Unknown eval cases: {', '.join(unknown)}")
    return [by_id[case_id] for case_id in selected_ids]


def run_command(
    command: list[str] | str,
    *,
    cwd: Path,
    timeout: int,
    shell: bool = False,
    input_text: str | None = None,
) -> dict[str, Any]:
    started = datetime.now(timezone.utc)
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            input=input_text,
            timeout=timeout,
            shell=shell,
            env={**os.environ, "CI": "1", "NO_COLOR": "1"},
            check=False,
        )
        return {
            "exit_code": completed.returncode,
            "duration_seconds": round(
                (datetime.now(timezone.utc) - started).total_seconds(), 3
            ),
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    except subprocess.TimeoutExpired as error:
        def decode_output(value: bytes | str | None) -> str:
            return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value or ""

        return {
            "exit_code": 124,
            "duration_seconds": timeout,
            "stdout": decode_output(error.stdout),
            "stderr": decode_output(error.stderr) or f"Timed out after {timeout} seconds",
        }


def initialize_workspace(case: dict[str, Any], mode: str) -> Path:
    workspace = Path(tempfile.mkdtemp(prefix=f"frontend-architect-{case['id']}-{mode}-"))
    fixture = case.get("fixture")
    if fixture:
        shutil.copytree(ROOT / fixture, workspace, dirs_exist_ok=True)

    subprocess.run(["git", "init", "--quiet"], cwd=workspace, check=True)
    subprocess.run(["git", "config", "user.email", "eval@example.invalid"], cwd=workspace, check=True)
    subprocess.run(["git", "config", "user.name", "Frontend Architect Eval"], cwd=workspace, check=True)
    info_exclude = workspace / ".git/info/exclude"
    with info_exclude.open("a", encoding="utf-8") as exclude:
        exclude.write("\n.frontend-architect/\nnode_modules/\ndist/\n*.tgz\n")
    subprocess.run(["git", "add", "."], cwd=workspace, check=True)
    subprocess.run(
        ["git", "commit", "--quiet", "--allow-empty", "-m", "eval fixture"],
        cwd=workspace,
        check=True,
    )
    subprocess.run(["git", "tag", "eval-fixture-base"], cwd=workspace, check=True)

    if mode == "candidate":
        skill_dir = workspace / ".frontend-architect"
        skill_dir.mkdir()
        shutil.copy2(ROOT / "SKILL.md", skill_dir / "SKILL.md")
        shutil.copytree(ROOT / "references", skill_dir / "references")
        shutil.copy2(ROOT / "CONTRIBUTING.md", skill_dir / "CONTRIBUTING.md")
    return workspace


def build_prompt(case: dict[str, Any], mode: str) -> str:
    sections = [
        "Complete the following frontend task in the provided workspace.",
        "Preserve the requested stack and scope. Inspect existing files before deciding.",
    ]
    if mode == "candidate":
        sections.extend(
            [
                "Before solving the task, read .frontend-architect/SKILL.md completely.",
                "Treat that local copy as the only task-specific Skill for this evaluation.",
                "Read routed references only from .frontend-architect/references; do not read an installed or global frontend-architect Skill or reference.",
                "For auditable guidance reads, use standalone cat commands with explicit file paths (no globs, variables, pipes or chained commands). Read SKILL.md in full; references may also use sed -n with a numeric print range and explicit paths. List files separately from reading them.",
                "Do not read any eval definitions, rubric, expected observations, or prior results.",
            ]
        )
    else:
        sections.extend(
            [
                "This is a no-Skill baseline. Do not read or use any local, installed, or global "
                "frontend-architect Skill or reference file.",
                "Do not read any eval definitions, rubric, expected observations, or prior results.",
            ]
        )
    if case.get("task_type") == "review":
        sections.append(
            "Review the supplied before/ and after/ repository snapshots. Discover the requirements "
            "and affected paths from those files; report findings without changing any fixture files. "
            "A nonzero git diff --no-index exit status of 1 means the snapshots differ, not a test failure."
        )
    elif case.get("fixture"):
        sections.append(
            "Implement the complete solution directly in this workspace and run the relevant checks. "
            "Do not leave pseudocode or TODOs."
        )
        protected_paths = case.get("protected_paths", [])
        if protected_paths:
            sections.append(
                "Treat these existing evaluation harness files as read-only; add separate tests if "
                "you need more coverage: " + ", ".join(protected_paths) + "."
            )
    else:
        sections.append("Return a concrete, decision-oriented answer; do not invent repository facts.")

    sections.append("\nUSER REQUEST:\n" + case["prompt"])
    artifact = case.get("artifact", "").strip()
    if artifact:
        sections.append("\nPROVIDED ARTIFACT:\n" + artifact)
    return "\n".join(sections)


def review_context(workspace: Path) -> str:
    """Freeze raw review inputs for blind scoring; no oracle or expected findings."""
    parts = []
    for snapshot in ("before", "after"):
        for path in sorted((workspace / snapshot).rglob("*")):
            if path.is_file():
                parts.append(f"\nFILE {path.relative_to(workspace)}\n" + path.read_text(encoding="utf-8"))
    return "\n".join(parts)


def capture_contract(case: dict[str, Any], root: Path) -> dict[str, Any]:
    """Freeze the task and executable acceptance contract, separately from grading rules."""
    fixture = case.get("fixture")
    return {
        "version": 1,
        "prompt": case["prompt"], "artifact": case.get("artifact", ""),
        "task_type": case.get("task_type", "implementation"), "fixture": fixture,
        "protected_paths": case.get("protected_paths", []),
        "validation_commands": case.get("validation_commands", []),
        "fixture_files": {
            str(path.relative_to(root / fixture)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted((root / fixture).rglob("*")) if path.is_file()
        } if fixture else {},
    }


def expected_validation_commands(case: dict[str, Any]) -> list[str]:
    commands = []
    if case.get("task_type") == "review":
        commands.append("verify review fixture unchanged")
    if case.get("fixture") and case.get("protected_paths"):
        commands.append("verify protected evaluation harness")
    return commands + case.get("validation_commands", [])


def routing_capture_valid(routing: dict[str, Any]) -> bool:
    """New breadth exceptions need scoring; legacy captures keep their old gate."""
    if routing.get("routing_policy_version", 1) < 2:
        return routing.get("breadth_ok", True)
    return routing.get("rendering_common_ok", True)


GUIDANCE_HINT = re.compile(r"\.frontend-architect|frontend-architect/|SKILL\.md|references/")
REFERENCE_NAMES = frozenset(path.name for path in (ROOT / "references").glob("*.md"))


def mentions_guidance(text: str) -> bool:
    return bool(GUIDANCE_HINT.search(text)) or any(name in text for name in REFERENCE_NAMES)


def guidance_read_paths(item: dict[str, Any]) -> tuple[list[str], str | None]:
    """Recognize a small read protocol, not arbitrary shell execution.

    Unknown visible guidance access invalidates the capture. This is an event
    audit, not an OS-level guarantee about hidden reads inside arbitrary programs.
    """
    command = item.get("command", "")
    if not mentions_guidance(command):
        return [], None
    try:
        words = shlex.split(command)
        if len(words) == 3 and Path(words[0]).name in {"sh", "bash", "zsh"} and words[1] in {"-c", "-lc"}:
            words = shlex.split(words[2])
    except ValueError:
        return [], "Unparseable guidance command"
    if not words:
        return [], None
    # Refuse compound commands rather than accidentally crediting just one part.
    if any(re.search(r"[;&|<>`\n]|\$\(", word) for word in words):
        return [], "Compound or redirected guidance command"
    program = Path(words[0]).name
    if program in {"ls", "stat"} or (program == "rg" and "--files" in words):
        return [], None
    if program == "cat":
        paths = words[1:]
        if paths[:1] == ["--"]:
            paths = paths[1:]
    elif program == "sed" and len(words) >= 4 and words[1] == "-n" and re.fullmatch(r"\d+(?:,\d+|,\$)?p", words[2]):
        paths = words[3:]
        if any(Path(path).name == "SKILL.md" for path in paths):
            return [], "Use cat to establish a full skill-entry read"
    else:
        return [], "Unsupported guidance read command"
    if not paths or any(path.startswith("-") or re.search(r"[*?\[\]{}$~]", path) for path in paths):
        return [], "Guidance read needs explicit literal paths"
    if any(Path(path).name in REFERENCE_NAMES and Path(path).parent == Path('.') for path in paths):
        if not item.get("cwd") and not item.get("workdir"):
            return [], "Reference basename read has no captured working directory"
    if item.get("exit_code") != 0 or not item.get("aggregated_output", "").strip():
        return [], "Guidance read did not return successful nonempty output"
    return paths, None


def capture_errors(record: dict[str, Any]) -> list[str]:
    """Execution/isolation failures are invalid samples, not low quality scores."""
    errors = []
    if record.get("generation", {}).get("exit_code") != 0:
        errors.append("Generation did not complete successfully")
    routing = record.get("reference_routing", {})
    if routing.get("read_audit_status") != "recognized":
        errors.append("Guidance read evidence is unknown or uses an older audit; rerun capture")
    if routing.get("isolation_ok") is not True or routing.get("skill_isolation_ok") is not True:
        errors.append("Skill isolation was not established")
    if record["mode"] == "candidate" and routing.get("local_skill_read") is not True:
        errors.append("Candidate did not read the local skill entry")
    if record["mode"] == "baseline" and (routing.get("files") or routing.get("skill_paths")):
        errors.append("No-skill baseline read guidance")
    if not routing_capture_valid(routing):
        errors.append("Required rendering guidance or legacy routing gate failed")
    if any(v["command"] == "verify protected evaluation harness" and v["exit_code"] != 0 for v in record.get("validations", [])):
        errors.append("Protected evaluation harness changed")
    return errors


def analyze_reference_reads(events_text: str, workspace: Path) -> dict[str, Any]:
    files: set[str] = set()
    contaminated_files: set[str] = set()
    skill_paths: set[str] = set()
    contaminated_skill_paths: set[str] = set()
    unknown_reads: list[dict[str, str]] = []
    pending: dict[str, dict[str, Any]] = {}
    local_references = (workspace / ".frontend-architect/references").resolve()
    local_skill = (workspace / ".frontend-architect/SKILL.md").resolve()

    for line in events_text.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            if line.strip():
                unknown_reads.append({"reason": "Malformed execution event"})
            continue
        if not isinstance(event, dict):
            unknown_reads.append({"reason": "Malformed execution event"})
            continue
        item = event.get("item")
        if isinstance(item, dict) and event.get("type") == "item.started":
            if item.get("id"):
                pending[item["id"]] = item
            else:
                unknown_reads.append({"reason": "Started execution item has no ID"})
        if isinstance(item, dict) and event.get("type") == "item.completed":
            pending.pop(item.get("id"), None)
        if event.get("type") != "item.completed" or not isinstance(item, dict):
            continue
        if item.get("type") != "command_execution":
            if item.get("type") != "agent_message" and mentions_guidance(json.dumps(item)):
                unknown_reads.append({"reason": "Guidance access through an unrecognized tool"})
            continue
        command = item.get("command")
        if not isinstance(command, str):
            continue

        paths, unknown = guidance_read_paths(item)
        if unknown:
            unknown_reads.append({"command": command, "reason": unknown})
        cwd = Path(item.get("cwd") or item.get("workdir") or workspace)
        if not cwd.is_absolute():
            if paths:
                unknown_reads.append({"command": command, "reason": "Relative execution working directory"})
            continue
        paths = [str((cwd / path).resolve()) for path in paths]
        for skill_path in paths:
            if Path(skill_path).name != "SKILL.md":
                continue
            skill_paths.add(skill_path)
            candidate_path = (workspace / skill_path).resolve()
            if candidate_path == local_skill:
                continue
            contaminated_skill_paths.add(skill_path)

        for reference_path in paths:
            if ("references" not in Path(reference_path).parts and Path(reference_path).name not in REFERENCE_NAMES) or not reference_path.endswith(".md"):
                continue
            reference_file = Path(reference_path).name
            files.add(reference_file)

            candidate_path = (workspace / reference_path).resolve()
            if candidate_path.is_relative_to(local_references):
                continue
            contaminated_files.add(reference_file)

    if not events_text.strip():
        unknown_reads.append({"reason": "Missing execution events"})
    for item in pending.values():
        unknown_reads.append({"reason": "Execution item did not complete", "item_id": item["id"]})

    rendering_extensions = {
        "rendering-app.md",
        "rendering-mini-program.md",
        "rendering-web.md",
    }
    selected_rendering_extensions = rendering_extensions.intersection(files)
    has_rendering_common = "rendering-and-performance.md" in files
    rendering_ok = len(selected_rendering_extensions) <= 1 and (
        not selected_rendering_extensions or has_rendering_common
    )
    topic_count = len(files)
    if has_rendering_common and len(selected_rendering_extensions) == 1:
        topic_count -= 1

    return {
        "read_audit_version": 2,
        "read_audit_status": "unknown" if unknown_reads else "recognized",
        "unknown_reads": unknown_reads,
        "files": sorted(files),
        "topic_count": topic_count,
        # Legacy fields retain the original default-route meaning, not approval.
        "breadth_ok": topic_count <= 2 and rendering_ok,
        "routing_policy_version": 2,
        "breadth_review_required": topic_count > 2 or len(selected_rendering_extensions) > 1,
        "rendering_common_ok": not selected_rendering_extensions or has_rendering_common,
        "rendering_route_ok": rendering_ok,
        "skill_paths": sorted(skill_paths),
        "local_skill_read": any(
            (workspace / path).resolve() == local_skill
            for path in skill_paths
        ),
        "skill_isolation_ok": not contaminated_skill_paths,
        "isolation_ok": not contaminated_files and not contaminated_skill_paths,
        "contaminated_files": sorted(contaminated_files),
        "contaminated_skill_paths": sorted(contaminated_skill_paths),
    }


def codex_command(args: argparse.Namespace, workspace: Path, output_path: Path) -> list[str]:
    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--skip-git-repo-check",
        "--sandbox",
        "workspace-write",
        "--cd",
        str(workspace),
        "--model",
        args.model,
        "--config",
        f'model_reasoning_effort="{args.reasoning_effort}"',
        "--output-last-message",
        str(output_path),
        "--json",
    ]
    for feature in DISABLED_FEATURES:
        command.extend(["--disable", feature])
    command.append("-")
    return command


def capture_diff(workspace: Path, baseline: str = FIXTURE_BASE_REF) -> str:
    subprocess.run(["git", "add", "-N", "."], cwd=workspace, check=True)
    completed = subprocess.run(
        ["git", "diff", "--no-ext-diff", "--binary", baseline],
        cwd=workspace,
        capture_output=True,
        text=True,
        check=True,
    )
    return completed.stdout


def validate_protected_paths(case: dict[str, Any], workspace: Path) -> dict[str, Any] | None:
    fixture = case.get("fixture")
    protected_paths = case.get("protected_paths", [])
    if not fixture or not protected_paths:
        return None

    fixture_root = (ROOT / fixture).resolve()
    failures: list[str] = []
    for raw_path in protected_paths:
        relative_path = Path(raw_path)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            failures.append(f"invalid protected path: {raw_path}")
            continue

        expected_path = fixture_root / relative_path
        actual_path = workspace / relative_path
        if not expected_path.is_file():
            failures.append(f"protected fixture file is missing: {raw_path}")
        elif not actual_path.is_file():
            failures.append(f"protected workspace file was removed: {raw_path}")
        elif actual_path.read_bytes() != expected_path.read_bytes():
            failures.append(f"protected workspace file was modified: {raw_path}")

    return {
        "command": "verify protected evaluation harness",
        "exit_code": 1 if failures else 0,
        "duration_seconds": 0.0,
        "stdout": "\n".join(failures) + ("\n" if failures else ""),
        "stderr": "",
    }


def validate_fixture(case: dict[str, Any], workspace: Path, timeout: int, baseline: str = FIXTURE_BASE_REF) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    if case.get("task_type") == "review":
        diff = capture_diff(workspace, baseline)
        results.append({"command": "verify review fixture unchanged", "exit_code": 1 if diff else 0,
                        "duration_seconds": 0.0, "stdout": diff, "stderr": ""})
        if diff:
            return results
    protected_result = validate_protected_paths(case, workspace)
    if protected_result:
        results.append(protected_result)
        if protected_result["exit_code"] != 0:
            return results

    for command in case.get("validation_commands", []):
        result = run_command(command, cwd=workspace, timeout=timeout, shell=True)
        results.append({"command": command, **result})
        if result["exit_code"] != 0:
            break
    return results


def write_manifest(path: Path, manifest: dict[str, Any]) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    cases = load_cases(args.case_ids)
    modes = ("baseline", "candidate") if args.mode == "both" else (args.mode,)
    results_dir = args.results_dir.resolve()
    results_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = results_dir / "manifest.json"
    if args.append and manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("model") != args.model or manifest.get("reasoning_effort") != args.reasoning_effort:
            raise SystemExit("Cannot append results produced with a different model configuration")
        replacement_keys = {(case["id"], mode) for case in cases for mode in modes}
        manifest["cases"] = [
            record
            for record in manifest["cases"]
            if (record["id"], record["mode"]) not in replacement_keys
        ]
        manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
    else:
        manifest = {
            "schema_version": 1,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "model": args.model,
            "reasoning_effort": args.reasoning_effort,
            "codex_version": subprocess.run(
                ["codex", "--version"], capture_output=True, text=True, check=True
            ).stdout.strip(),
            "platform": platform.platform(),
            "cases": [],
        }
    write_manifest(manifest_path, manifest)

    for case in cases:
        for mode in modes:
            print(f"[{case['id']}] {mode}", flush=True)
            case_dir = results_dir / case["id"] / mode
            case_dir.mkdir(parents=True, exist_ok=True)
            workspace = initialize_workspace(case, mode)
            baseline = subprocess.run(["git", "rev-parse", FIXTURE_BASE_REF], cwd=workspace,
                                      capture_output=True, text=True, check=True).stdout.strip()
            contract = capture_contract(case, ROOT)
            if case.get("task_type") == "review":
                (case_dir / "review-context.md").write_text(review_context(workspace), encoding="utf-8")
            prompt = build_prompt(case, mode)
            (case_dir / "prompt.txt").write_text(prompt + "\n", encoding="utf-8")
            final_path = case_dir / "response.md"
            final_path.unlink(missing_ok=True)
            generation = run_command(
                codex_command(args, workspace, final_path),
                cwd=workspace,
                timeout=args.timeout_seconds,
                input_text=prompt,
            )
            events_text = generation.pop("stdout")
            (case_dir / "events.jsonl").write_text(events_text, encoding="utf-8")
            (case_dir / "generation.stderr.log").write_text(
                generation.pop("stderr"), encoding="utf-8"
            )

            validations = validate_fixture(case, workspace, args.timeout_seconds, baseline)
            for index, validation in enumerate(validations, start=1):
                log = validation.pop("stdout") + validation.pop("stderr")
                (case_dir / f"validation-{index}.log").write_text(log, encoding="utf-8")
            diff_path = case_dir / "changes.diff"
            diff_path.write_text(capture_diff(workspace, baseline), encoding="utf-8")

            manifest["cases"].append(
                {
                    "id": case["id"],
                    "mode": mode,
                    "workspace": str(workspace),
                    "fixture_base_commit": baseline,
                    "capture_contract": contract,
                    "events_sha256": hashlib.sha256(events_text.encode("utf-8")).hexdigest(),
                    "generation": generation,
                    "reference_routing": analyze_reference_reads(events_text, workspace),
                    "validations": validations,
                    "response": str(final_path.relative_to(results_dir)),
                    "diff": str(diff_path.relative_to(results_dir)),
                }
            )
            write_manifest(manifest_path, manifest)

    manifest["completed_at"] = datetime.now(timezone.utc).isoformat()
    write_manifest(manifest_path, manifest)
    infrastructure_ok = all(not capture_errors(record) for record in manifest["cases"])
    candidates_valid = all(
        all(item["exit_code"] == 0 for item in record["validations"])
        and record.get("reference_routing", {}).get("local_skill_read", False)
        and record.get("reference_routing", {}).get("skill_isolation_ok", True)
        and record.get("reference_routing", {}).get("isolation_ok", True)
        and routing_capture_valid(record.get("reference_routing", {}))
        for record in manifest["cases"]
        if record["mode"] == "candidate"
    )
    baselines_isolated = all(
        not record.get("reference_routing", {}).get("files")
        and not record.get("reference_routing", {}).get("skill_paths")
        and record.get("reference_routing", {}).get("isolation_ok", True)
        for record in manifest["cases"]
        if record["mode"] == "baseline"
    )
    return 0 if infrastructure_ok and candidates_valid and baselines_isolated else 1


if __name__ == "__main__":
    raise SystemExit(main())
