#!/usr/bin/env python3
"""Blind-score captured behavior evals without exposing the comparison mode."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parent.parent
DISABLED_FEATURES = (
    "apps",
    "multi_agent",
    "multi_agent_v2",
    "plugins",
    "skill_search",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results-dir", required=True, type=Path)
    parser.add_argument("--model", default="gpt-5.4")
    parser.add_argument("--reasoning-effort", default="medium")
    parser.add_argument("--mode", choices=("baseline", "candidate", "both"), default="both")
    parser.add_argument("--case", action="append", dest="case_ids")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--timeout-seconds", type=int, default=900)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def output_score_schema(path: Path) -> None:
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": False,
        "required": ["evaluations"],
        "properties": {
            "evaluations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "dimensions", "global_failures", "evidence_limits"],
                    "properties": {
                        "id": {"type": "string"},
                        "dimensions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["key", "score", "reason"],
                                "properties": {
                                    "key": {"type": "string"},
                                    "score": {"type": "integer", "minimum": 0, "maximum": 2},
                                    "reason": {"type": "string"},
                                },
                            },
                        },
                        "global_failures": {"type": "array", "items": {"type": "string"}},
                        "evidence_limits": {"type": "array", "items": {"type": "string"}},
                    },
                },
            }
        },
    }
    path.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")


def output_failure_schema(path: Path) -> None:
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": False,
        "required": ["audits"],
        "properties": {
            "audits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "triggered"],
                    "properties": {
                        "id": {"type": "string"},
                        "triggered": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["rule", "reason"],
                                "properties": {
                                    "rule": {"type": "string"},
                                    "reason": {"type": "string"},
                                },
                            },
                        },
                    },
                },
            }
        },
    }
    path.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else "[missing]"


def build_prompt(
    mode: str,
    batch: list[dict[str, Any]],
    cases: dict[str, dict[str, Any]],
    results_dir: Path,
) -> str:
    rubric = load_text(ROOT / "evals/rubric.md")
    parts = [
        "You are an independent evaluator. Score only the supplied evidence.",
        "You are seeing one anonymous evaluation condition. Do not guess or compare against another condition.",
        "The case-specific expected observations and failure list are intentionally hidden.",
        "Score every applicable dimension exactly once with an integer 0, 1, or 2.",
        "Treat a failed validation command as direct evidence against implementation_integrity and verification_evidence.",
        "List only triggered global rubric failures. Record missing evidence under evidence_limits.",
        "\nRUBRIC:\n" + rubric,
    ]

    for record in batch:
        case = cases[record["id"]]
        case_dir = results_dir / record["id"] / mode
        validations = []
        for index, validation in enumerate(record["validations"], start=1):
            validations.append(
                f"COMMAND {validation['command']} EXIT {validation['exit_code']}\n"
                + load_text(case_dir / f"validation-{index}.log")
            )
        parts.append(
            "\nCASE\n"
            f"id: {case['id']}\n"
            f"request: {case['prompt']}\n"
            f"artifact: {case.get('artifact', '')}\n"
            f"applicable_dimensions: {json.dumps(case['applicable_dimensions'])}\n"
            "\nRESPONSE:\n"
            + load_text(case_dir / "response.md")
            + "\n\nDIFF:\n"
            + load_text(case_dir / "changes.diff")
            + "\n\nVALIDATIONS:\n"
            + ("\n".join(validations) if validations else "No executable fixture for this case.")
        )
    return "\n".join(parts)


def build_failure_prompt(
    mode: str,
    batch: list[dict[str, Any]],
    cases: dict[str, dict[str, Any]],
    results_dir: Path,
) -> str:
    parts = [
        "You are performing the second-stage failure audit for one anonymous evaluation condition.",
        "Do not score quality, infer the comparison condition, or reward expected wording.",
        "For each case, inspect only whether the supplied response, diff, or validation evidence clearly triggers one of its listed one-vote failure rules.",
        "Missing optional detail is not a trigger unless the rule explicitly makes it one.",
        "Return each triggered rule verbatim with a concise evidence-based reason. Return an empty list when none is clearly triggered.",
    ]

    for record in batch:
        case = cases[record["id"]]
        case_dir = results_dir / record["id"] / mode
        validations = []
        for index, validation in enumerate(record["validations"], start=1):
            validations.append(
                f"COMMAND {validation['command']} EXIT {validation['exit_code']}\n"
                + load_text(case_dir / f"validation-{index}.log")
            )
        parts.append(
            "\nCASE\n"
            f"id: {case['id']}\n"
            f"request: {case['prompt']}\n"
            f"artifact: {case.get('artifact', '')}\n"
            f"failure_rules: {json.dumps(case['fail_if'], ensure_ascii=False)}\n"
            "\nRESPONSE:\n"
            + load_text(case_dir / "response.md")
            + "\n\nDIFF:\n"
            + load_text(case_dir / "changes.diff")
            + "\n\nVALIDATIONS:\n"
            + ("\n".join(validations) if validations else "No executable fixture for this case.")
        )
    return "\n".join(parts)


def run_score(
    args: argparse.Namespace,
    prompt: str,
    schema_path: Path,
    output_path: Path,
) -> subprocess.CompletedProcess[str]:
    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--cd",
        tempfile.gettempdir(),
        "--model",
        args.model,
        "--config",
        f'model_reasoning_effort="{args.reasoning_effort}"',
        "--output-schema",
        str(schema_path),
        "--output-last-message",
        str(output_path),
    ]
    for feature in DISABLED_FEATURES:
        command.extend(["--disable", feature])
    command.append("-")
    return subprocess.run(
        command,
        input=prompt,
        capture_output=True,
        text=True,
        timeout=args.timeout_seconds,
        env={**os.environ, "NO_COLOR": "1"},
        check=False,
    )


def validate_and_normalize(
    raw: dict[str, Any],
    batch: list[dict[str, Any]],
    cases: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    expected_ids = [record["id"] for record in batch]
    evaluations = raw.get("evaluations", [])
    if [item.get("id") for item in evaluations] != expected_ids:
        raise ValueError(f"Scorer returned unexpected ids; expected {expected_ids}")

    for evaluation in evaluations:
        expected_dimensions = cases[evaluation["id"]]["applicable_dimensions"]
        actual_dimensions = [item["key"] for item in evaluation["dimensions"]]
        if actual_dimensions != expected_dimensions:
            raise ValueError(
                f"{evaluation['id']} returned dimensions {actual_dimensions}; "
                f"expected {expected_dimensions}"
            )
        earned = sum(item["score"] for item in evaluation["dimensions"])
        normalized = round(earned / (len(expected_dimensions) * 2) * 16, 2)
        evaluation["normalized_score"] = normalized
    return evaluations


def validate_failure_audits(
    raw: dict[str, Any],
    batch: list[dict[str, Any]],
    cases: dict[str, dict[str, Any]],
) -> dict[str, list[dict[str, str]]]:
    expected_ids = [record["id"] for record in batch]
    audits = raw.get("audits", [])
    if [item.get("id") for item in audits] != expected_ids:
        raise ValueError(f"Failure auditor returned unexpected ids; expected {expected_ids}")

    validated: dict[str, list[dict[str, str]]] = {}
    for audit in audits:
        if not isinstance(audit, dict):
            raise ValueError("Failure audit entries must be objects")
        case_id = audit["id"]
        allowed_rules = set(cases[case_id]["fail_if"])
        triggered = audit.get("triggered")
        if not isinstance(triggered, list):
            raise ValueError(f"Failure audit for {case_id} must contain a triggered list")
        if any(not isinstance(item, dict) for item in triggered):
            raise ValueError(f"Failure audit for {case_id} contains an invalid entry")
        rules = [item.get("rule") for item in triggered]
        if len(rules) != len(set(rules)):
            raise ValueError(f"Failure audit for {case_id} contains duplicate rules")
        unexpected = [rule for rule in rules if rule not in allowed_rules]
        if unexpected:
            raise ValueError(
                f"Failure audit for {case_id} returned unknown rules: {unexpected}"
            )
        if any(
            not isinstance(item.get("reason"), str) or not item["reason"].strip()
            for item in triggered
        ):
            raise ValueError(f"Failure audit for {case_id} contains an invalid reason")
        validated[case_id] = triggered
    return validated


def validate_score_configuration(
    scores: dict[str, Any],
    model: str,
    reasoning_effort: str,
) -> None:
    existing = (scores.get("model"), scores.get("reasoning_effort"))
    requested = (model, reasoning_effort)
    if existing != requested:
        raise ValueError(
            "Existing score configuration "
            f"model={existing[0]!r}, reasoning_effort={existing[1]!r} "
            "does not match requested configuration "
            f"model={model!r}, reasoning_effort={reasoning_effort!r}. "
            "Use a different results directory to preserve comparable evidence."
        )


def finalize_evaluations(
    evaluations: list[dict[str, Any]],
    case_failures: dict[str, list[dict[str, str]]],
) -> list[dict[str, Any]]:
    for evaluation in evaluations:
        evaluation["case_failures"] = case_failures[evaluation["id"]]
        if evaluation["global_failures"] or evaluation["case_failures"]:
            evaluation["verdict"] = "fail"
        else:
            normalized = evaluation["normalized_score"]
            evaluation["verdict"] = (
                "target" if normalized >= 13 else "basic" if normalized >= 9 else "fail"
            )
    return evaluations


def main() -> int:
    args = parse_args()
    results_dir = args.results_dir.resolve()
    manifest = json.loads(load_text(results_dir / "manifest.json"))
    case_document = yaml.safe_load(load_text(ROOT / "evals/cases.yaml"))
    cases = {case["id"]: case for case in case_document["cases"]}
    score_dir = results_dir / "blind-scores"
    score_dir.mkdir(parents=True, exist_ok=True)
    score_schema_path = score_dir / "schema.json"
    failure_schema_path = score_dir / "failure-schema.json"
    output_score_schema(score_schema_path)
    output_failure_schema(failure_schema_path)
    scores_path = score_dir / "scores.json"
    if scores_path.is_file():
        merged = json.loads(scores_path.read_text(encoding="utf-8"))
        try:
            validate_score_configuration(merged, args.model, args.reasoning_effort)
        except ValueError as error:
            raise SystemExit(str(error)) from error
    else:
        merged = {
            "schema_version": 1,
            "model": args.model,
            "reasoning_effort": args.reasoning_effort,
            "conditions": {},
        }

    modes = ("baseline", "candidate") if args.mode == "both" else (args.mode,)
    for mode in modes:
        records = [
            record
            for record in manifest["cases"]
            if record["mode"] == mode
            and (not args.case_ids or record["id"] in args.case_ids)
        ]
        if args.case_ids:
            missing = sorted(set(args.case_ids) - {record["id"] for record in records})
            if missing:
                raise SystemExit(f"Missing captured results for: {', '.join(missing)}")
        scores: list[dict[str, Any]] = []
        for offset in range(0, len(records), args.batch_size):
            batch = records[offset : offset + args.batch_size]
            batch_number = offset // args.batch_size + 1
            print(f"[{mode}] blind score batch {batch_number}", flush=True)
            prompt = build_prompt(mode, batch, cases, results_dir)
            prompt_path = score_dir / f"{mode}-{batch_number}.prompt.txt"
            output_path = score_dir / f"{mode}-{batch_number}.json"
            prompt_path.write_text(prompt, encoding="utf-8")
            batch_scores: list[dict[str, Any]] = []
            if not args.force:
                try:
                    batch_scores = validate_and_normalize(
                        json.loads(load_text(output_path)), batch, cases
                    )
                except (json.JSONDecodeError, ValueError):
                    batch_scores = []

            for attempt in range(2):
                if batch_scores:
                    break
                retry_prompt = prompt
                if attempt == 1:
                    retry_prompt += (
                        "\n\nYour previous JSON omitted or reordered required cases or dimensions. "
                        "Return every case in the supplied order and every applicable dimension "
                        "in the exact listed order, even when the score is zero."
                    )
                completed = run_score(args, retry_prompt, score_schema_path, output_path)
                (score_dir / f"{mode}-{batch_number}.stderr.log").write_text(
                    completed.stderr, encoding="utf-8"
                )
                if completed.returncode != 0:
                    continue
                try:
                    batch_scores = validate_and_normalize(
                        json.loads(load_text(output_path)), batch, cases
                    )
                except (json.JSONDecodeError, ValueError):
                    batch_scores = []

            if not batch_scores:
                raise SystemExit(f"Scorer returned invalid output for {mode} batch {batch_number}")

            failure_prompt = build_failure_prompt(mode, batch, cases, results_dir)
            failure_prompt_path = score_dir / f"{mode}-{batch_number}.failures.prompt.txt"
            failure_output_path = score_dir / f"{mode}-{batch_number}.failures.json"
            failure_prompt_path.write_text(failure_prompt, encoding="utf-8")
            case_failures: dict[str, list[dict[str, str]]] = {}
            if not args.force:
                try:
                    case_failures = validate_failure_audits(
                        json.loads(load_text(failure_output_path)), batch, cases
                    )
                except (json.JSONDecodeError, ValueError):
                    case_failures = {}

            for attempt in range(2):
                if case_failures:
                    break
                retry_prompt = failure_prompt
                if attempt == 1:
                    retry_prompt += (
                        "\n\nReturn every case in the supplied order. Use only exact rule text "
                        "from that case's failure_rules, and return an empty triggered list when none apply."
                    )
                completed = run_score(
                    args,
                    retry_prompt,
                    failure_schema_path,
                    failure_output_path,
                )
                (score_dir / f"{mode}-{batch_number}.failures.stderr.log").write_text(
                    completed.stderr, encoding="utf-8"
                )
                if completed.returncode != 0:
                    continue
                try:
                    case_failures = validate_failure_audits(
                        json.loads(load_text(failure_output_path)), batch, cases
                    )
                except (json.JSONDecodeError, ValueError):
                    case_failures = {}

            if not case_failures:
                raise SystemExit(
                    f"Failure auditor returned invalid output for {mode} batch {batch_number}"
                )
            scores.extend(finalize_evaluations(batch_scores, case_failures))
        if args.case_ids and mode in merged["conditions"]:
            replacements = {score["id"]: score for score in scores}
            merged["conditions"][mode] = [
                replacements.get(score["id"], score)
                for score in merged["conditions"][mode]
            ]
        else:
            merged["conditions"][mode] = scores

    scores_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
