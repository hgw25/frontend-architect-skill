#!/usr/bin/env python3
"""Regression tests for behavior-evaluation verdict and failure handling."""

from __future__ import annotations

import copy
import unittest
import tempfile
import json
from pathlib import Path

from score_behavior_evals import (
    finalize_evaluations,
    build_prompt,
    build_failure_prompt,
    validate_and_normalize,
    validate_failure_audits,
    validate_score_configuration,
)


CASE_ID = "example-case"
FAILURE_RULE = "Do not use a universal controller"
CASES = {
    CASE_ID: {
        "applicable_dimensions": ["solution_complexity", "module_boundaries"],
        "fail_if": [FAILURE_RULE],
    }
}
BATCH = [{"id": CASE_ID}]


def raw_score(*, global_failures: list[str] | None = None) -> dict:
    return {
        "evaluations": [
            {
                "id": CASE_ID,
                "dimensions": [
                    {"key": "solution_complexity", "score": 2, "reason": "focused"},
                    {"key": "module_boundaries", "score": 2, "reason": "owned"},
                ],
                "global_failures": global_failures or [],
                "evidence_limits": [],
            }
        ]
    }


class RoutingEvidenceTests(unittest.TestCase):
    def test_only_second_stage_gets_commands_and_stated_reasons(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            case_dir = root / CASE_ID / "candidate"
            case_dir.mkdir(parents=True)
            events = [
                {"type": "item.completed", "item": {"type": "agent_message", "text": "New gap: native keyboard ownership"}},
                {"type": "item.completed", "item": {"type": "command_execution", "command": "cat rendering-app.md", "aggregated_output": "excluded-output"}},
            ]
            (case_dir / "events.jsonl").write_text("\n".join(json.dumps(event) for event in events))
            batch = [{"id": CASE_ID, "validations": [], "reference_routing": {"breadth_review_required": True}}]
            cases = {CASE_ID: {**CASES[CASE_ID], "id": CASE_ID, "prompt": "Support web and native clients"}}
            quality = build_prompt("candidate", batch, cases, root)
            audit = build_failure_prompt("candidate", batch, cases, root)
        self.assertNotIn("New gap: native keyboard ownership", quality)
        self.assertIn("New gap: native keyboard ownership", audit)
        self.assertIn("cat rendering-app.md", audit)
        self.assertNotIn("excluded-output", audit)


class VerdictTests(unittest.TestCase):
    def evaluate(
        self,
        *,
        global_failures: list[str] | None = None,
        case_failures: list[dict[str, str]] | None = None,
    ) -> dict:
        evaluations = validate_and_normalize(
            copy.deepcopy(raw_score(global_failures=global_failures)),
            BATCH,
            CASES,
        )
        return finalize_evaluations(
            evaluations,
            {CASE_ID: case_failures or []},
        )[0]

    def test_high_score_without_failures_reaches_target(self) -> None:
        evaluation = self.evaluate()
        self.assertEqual(evaluation["normalized_score"], 16)
        self.assertEqual(evaluation["verdict"], "target")

    def test_global_failure_overrides_high_score(self) -> None:
        evaluation = self.evaluate(global_failures=["Leaked a browser secret"])
        self.assertEqual(evaluation["normalized_score"], 16)
        self.assertEqual(evaluation["verdict"], "fail")

    def test_case_failure_overrides_high_score(self) -> None:
        evaluation = self.evaluate(
            case_failures=[{"rule": FAILURE_RULE, "reason": "One hook owns everything"}]
        )
        self.assertEqual(evaluation["normalized_score"], 16)
        self.assertEqual(evaluation["verdict"], "fail")

    def test_failure_audit_rejects_unknown_rule(self) -> None:
        raw = {
            "audits": [
                {
                    "id": CASE_ID,
                    "triggered": [{"rule": "Invented rule", "reason": "unsupported"}],
                }
            ]
        }
        with self.assertRaises(ValueError):
            validate_failure_audits(raw, BATCH, CASES)

    def test_failure_audit_accepts_empty_triggered_list(self) -> None:
        raw = {"audits": [{"id": CASE_ID, "triggered": []}]}
        self.assertEqual(
            validate_failure_audits(raw, BATCH, CASES),
            {CASE_ID: []},
        )

    def test_pending_breadth_cannot_reuse_unaudited_cached_score(self) -> None:
        batch = [{"id": CASE_ID, "reference_routing": {"breadth_review_required": True}}]
        with self.assertRaisesRegex(ValueError, "Routing review required"):
            validate_failure_audits({"audits": [{"id": CASE_ID, "triggered": []}]}, batch, CASES)

    def test_breadth_audit_requires_justification_to_pass(self) -> None:
        batch = [{"id": CASE_ID, "reference_routing": {"breadth_review_required": True}}]
        for verdict in ("justified", "unjustified", "insufficient_evidence"):
            with self.subTest(verdict=verdict):
                audits = validate_failure_audits({"audits": [{
                    "id": CASE_ID,
                    "triggered": [],
                    "routing_review": {"verdict": verdict, "reason": "Specific evidence assessment"},
                }]}, batch, CASES)
                evaluations = validate_and_normalize(raw_score(), batch, CASES)
                result = finalize_evaluations(evaluations, audits)[0]
                self.assertEqual(result["verdict"], "target" if verdict == "justified" else "fail")

    def test_score_configuration_rejects_mixed_reasoning_effort(self) -> None:
        scores = {"model": "gpt-5.4", "reasoning_effort": "medium"}
        with self.assertRaises(ValueError):
            validate_score_configuration(scores, "gpt-5.4", "high")

    def test_score_configuration_accepts_exact_match(self) -> None:
        scores = {"model": "gpt-5.4", "reasoning_effort": "medium"}
        validate_score_configuration(scores, "gpt-5.4", "medium")


if __name__ == "__main__":
    unittest.main()
