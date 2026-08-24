#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from run_behavior_evals import analyze_reference_reads, build_prompt, validate_protected_paths


def command_event(command: str) -> str:
    return json.dumps(
        {
            "type": "item.completed",
            "item": {"type": "command_execution", "command": command},
        }
    )


class BuildPromptTests(unittest.TestCase):
    def test_candidate_uses_only_the_isolated_skill_copy(self) -> None:
        prompt = build_prompt(
            {"prompt": "Implement the task.", "artifact": "", "fixture": None},
            "candidate",
        )

        self.assertIn(".frontend-architect/SKILL.md", prompt)
        self.assertIn(".frontend-architect/references", prompt)
        self.assertNotIn("$frontend-architect", prompt)

    def test_prompt_marks_protected_harness_files_read_only(self) -> None:
        prompt = build_prompt(
            {
                "prompt": "Implement the task.",
                "artifact": "",
                "fixture": "evals/fixtures/example",
                "protected_paths": ["package.json", "scripts/check.mjs"],
            },
            "candidate",
        )

        self.assertIn("evaluation harness files as read-only", prompt)
        self.assertIn("package.json, scripts/check.mjs", prompt)

    def test_baseline_explicitly_forbids_skill_loading(self) -> None:
        prompt = build_prompt(
            {"prompt": "Implement the task.", "artifact": "", "fixture": None},
            "baseline",
        )

        self.assertIn("no-Skill baseline", prompt)
        self.assertIn("Do not read or use any local, installed, or global", prompt)


class ProtectedPathTests(unittest.TestCase):
    def test_accepts_unchanged_protected_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            source = Path(__file__).resolve().parents[1] / "evals/cases.yaml"
            (workspace / "cases.yaml").write_bytes(source.read_bytes())

            result = validate_protected_paths(
                {
                    "fixture": "evals",
                    "protected_paths": ["cases.yaml"],
                },
                workspace,
            )

        self.assertIsNotNone(result)
        self.assertEqual(result["exit_code"], 0)

    def test_rejects_modified_protected_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            (workspace / "cases.yaml").write_text("weakened: true\n", encoding="utf-8")

            result = validate_protected_paths(
                {
                    "fixture": "evals",
                    "protected_paths": ["cases.yaml"],
                },
                workspace,
            )

        self.assertIsNotNone(result)
        self.assertEqual(result["exit_code"], 1)
        self.assertIn("was modified", result["stdout"])


class ReferenceReadTests(unittest.TestCase):
    def test_accepts_relative_and_workspace_local_reference_reads(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            local_path = workspace / ".frontend-architect/references/module-boundaries.md"
            events = "\n".join(
                [
                    command_event("cat .frontend-architect/SKILL.md"),
                    command_event("cat .frontend-architect/references/architecture-and-code.md"),
                    command_event(f"sed -n '1,200p' {local_path}"),
                ]
            )

            result = analyze_reference_reads(events, workspace)

        self.assertEqual(
            result["files"],
            ["architecture-and-code.md", "module-boundaries.md"],
        )
        self.assertTrue(result["isolation_ok"])
        self.assertTrue(result["local_skill_read"])
        self.assertTrue(result["skill_isolation_ok"])
        self.assertTrue(result["breadth_ok"])
        self.assertEqual(result["topic_count"], 2)
        self.assertEqual(result["contaminated_files"], [])

    def test_rejects_reference_reads_from_an_installed_skill(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = command_event(
                "cat /Users/example/.codex/skills/frontend-architect/"
                "references/frontend-infrastructure.md"
            )

            result = analyze_reference_reads(events, workspace)

        self.assertFalse(result["isolation_ok"])
        self.assertEqual(result["contaminated_files"], ["frontend-infrastructure.md"])

    def test_rejects_installed_skill_entry_even_without_reference_reads(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = command_event(
                "cat /Users/example/.codex/skills/frontend-architect/SKILL.md"
            )

            result = analyze_reference_reads(events, workspace)

        self.assertFalse(result["skill_isolation_ok"])
        self.assertFalse(result["isolation_ok"])
        self.assertFalse(result["local_skill_read"])
        self.assertEqual(len(result["contaminated_skill_paths"]), 1)

    def test_counts_common_rendering_and_one_platform_extension_as_one_topic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = "\n".join(
                [
                    command_event(
                        "cat .frontend-architect/references/rendering-and-performance.md"
                    ),
                    command_event("cat .frontend-architect/references/rendering-web.md"),
                    command_event(
                        "cat .frontend-architect/references/verification-and-review.md"
                    ),
                ]
            )

            result = analyze_reference_reads(events, workspace)

        self.assertEqual(result["topic_count"], 2)
        self.assertTrue(result["breadth_ok"])

    def test_rejects_more_than_two_routed_topics(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = "\n".join(
                command_event(f"cat .frontend-architect/references/{reference_file}")
                for reference_file in (
                    "frontend-infrastructure.md",
                    "runtime-and-delivery.md",
                    "security-and-trust.md",
                )
            )

            result = analyze_reference_reads(events, workspace)

        self.assertEqual(result["topic_count"], 3)
        self.assertFalse(result["breadth_ok"])

    def test_rejects_more_than_one_rendering_platform_extension(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = "\n".join(
                [
                    command_event(
                        "cat .frontend-architect/references/rendering-and-performance.md"
                    ),
                    command_event("cat .frontend-architect/references/rendering-web.md"),
                    command_event("cat .frontend-architect/references/rendering-app.md"),
                ]
            )

            result = analyze_reference_reads(events, workspace)

        self.assertFalse(result["rendering_route_ok"])
        self.assertFalse(result["breadth_ok"])

    def test_rejects_platform_extension_without_common_rendering_reference(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = command_event(
                "cat .frontend-architect/references/rendering-mini-program.md"
            )

            result = analyze_reference_reads(events, workspace)

        self.assertFalse(result["rendering_route_ok"])
        self.assertFalse(result["breadth_ok"])


if __name__ == "__main__":
    unittest.main()
