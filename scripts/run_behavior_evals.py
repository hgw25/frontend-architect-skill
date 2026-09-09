#!/usr/bin/env python3
"""Run isolated baseline/candidate sessions and preserve raw evaluation evidence."""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parent.parent
CASES_PATH = ROOT / "evals/cases.yaml"
DISABLED_FEATURES = (
    "apps",
    "multi_agent",
    "multi_agent_v2",
    "plugins",
    "skill_search",
)
REFERENCE_PATH = re.compile(
    r"(?P<path>(?:\.frontend-architect|/[^\"'`\s;|]+)?/references/"
    r"(?P<file>[a-z0-9-]+\.md))"
)
SKILL_PATH = re.compile(
    r"(?P<path>(?:\.frontend-architect|/[^\"'`\s;|]*frontend-architect[^\"'`\s;|]*)/"
    r"SKILL\.md)"
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
        return {
            "exit_code": 124,
            "duration_seconds": timeout,
            "stdout": error.stdout or "",
            "stderr": error.stderr or f"Timed out after {timeout} seconds",
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

    if mode == "candidate":
        skill_dir = workspace / ".frontend-architect"
        skill_dir.mkdir()
        shutil.copy2(ROOT / "SKILL.md", skill_dir / "SKILL.md")
        shutil.copytree(ROOT / "references", skill_dir / "references")
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
    if case.get("fixture"):
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


def routing_capture_valid(routing: dict[str, Any]) -> bool:
    """New breadth exceptions need scoring; legacy captures keep their old gate."""
    if routing.get("routing_policy_version", 1) < 2:
        return routing.get("breadth_ok", True)
    return routing.get("rendering_common_ok", True)


def analyze_reference_reads(events_text: str, workspace: Path) -> dict[str, Any]:
    files: set[str] = set()
    contaminated_files: set[str] = set()
    skill_paths: set[str] = set()
    contaminated_skill_paths: set[str] = set()
    local_references = (workspace / ".frontend-architect/references").resolve()
    local_skill = (workspace / ".frontend-architect/SKILL.md").resolve()

    for line in events_text.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        item = event.get("item")
        if event.get("type") != "item.completed" or not isinstance(item, dict):
            continue
        if item.get("type") != "command_execution":
            continue
        command = item.get("command")
        if not isinstance(command, str):
            continue

        for match in SKILL_PATH.finditer(command):
            skill_path = match.group("path")
            skill_paths.add(skill_path)
            if skill_path == ".frontend-architect/SKILL.md":
                continue
            candidate_path = Path(skill_path)
            if candidate_path.is_absolute() and candidate_path.resolve() == local_skill:
                continue
            contaminated_skill_paths.add(skill_path)

        for match in REFERENCE_PATH.finditer(command):
            reference_file = match.group("file")
            reference_path = match.group("path")
            files.add(reference_file)

            if reference_path.startswith(".frontend-architect/references/"):
                continue

            candidate_path = Path(reference_path)
            if candidate_path.is_absolute() and candidate_path.resolve().is_relative_to(
                local_references
            ):
                continue
            contaminated_files.add(reference_file)

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
            path == ".frontend-architect/SKILL.md"
            or (Path(path).is_absolute() and Path(path).resolve() == local_skill)
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


def capture_diff(workspace: Path) -> str:
    subprocess.run(["git", "add", "-N", "."], cwd=workspace, check=False)
    completed = subprocess.run(
        ["git", "diff", "--no-ext-diff", "--binary", "HEAD"],
        cwd=workspace,
        capture_output=True,
        text=True,
        check=False,
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


def validate_fixture(case: dict[str, Any], workspace: Path, timeout: int) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
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
            prompt = build_prompt(case, mode)
            (case_dir / "prompt.txt").write_text(prompt + "\n", encoding="utf-8")
            final_path = case_dir / "response.md"
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

            validations = validate_fixture(case, workspace, args.timeout_seconds)
            for index, validation in enumerate(validations, start=1):
                log = validation.pop("stdout") + validation.pop("stderr")
                (case_dir / f"validation-{index}.log").write_text(log, encoding="utf-8")
            diff_path = case_dir / "changes.diff"
            diff_path.write_text(capture_diff(workspace), encoding="utf-8")

            manifest["cases"].append(
                {
                    "id": case["id"],
                    "mode": mode,
                    "workspace": str(workspace),
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
    infrastructure_ok = all(
        record["generation"]["exit_code"] == 0 for record in manifest["cases"]
    )
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
