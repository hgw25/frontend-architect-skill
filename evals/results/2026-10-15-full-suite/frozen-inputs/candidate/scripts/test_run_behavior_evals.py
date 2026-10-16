#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import unittest
import subprocess
import sys
from unittest.mock import patch
from pathlib import Path

from run_behavior_evals import analyze_reference_reads, build_prompt, validate_protected_paths, routing_capture_valid, run_command, initialize_workspace, validate_fixture


def command_event(command: str) -> str:
    return json.dumps(
        {
            "type": "item.completed",
            "item": {"type": "command_execution", "command": command, "exit_code": 0, "aggregated_output": "file contents"},
        }
    )


class BuildPromptTests(unittest.TestCase):
    def test_review_fixture_does_not_receive_implementation_instructions(self) -> None:
        prompt = build_prompt({'prompt': 'Review the change', 'task_type': 'review', 'fixture': 'example'}, 'candidate')
        self.assertIn('without changing any fixture files', prompt)
        self.assertNotIn('Implement the complete solution', prompt)

    def test_candidate_uses_only_the_isolated_skill_copy(self) -> None:
        prompt = build_prompt(
            {"prompt": "Implement the task.", "artifact": "", "fixture": None},
            "candidate",
        )

        self.assertIn(".frontend-architect/SKILL.md", prompt)
        self.assertIn(".frontend-architect/references", prompt)
        self.assertNotIn("$frontend-architect", prompt)
        self.assertIn("Keep all files in .frontend-architect unchanged", prompt)

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
    def test_candidate_has_its_local_maintenance_source_and_baseline_has_no_guidance(self):
        import shutil
        import run_behavior_evals
        case = {'id': 'maintenance-source', 'prompt': 'Inspect package checks', 'artifact': ''}
        for mode in ('baseline', 'candidate'):
            with self.subTest(mode=mode):
                workspace = initialize_workspace(case, mode)
                self.addCleanup(shutil.rmtree, workspace)
                source = workspace / '.frontend-architect/CONTRIBUTING.md'
                if mode == 'candidate':
                    self.assertEqual(source.read_bytes(), (run_behavior_evals.ROOT / 'CONTRIBUTING.md').read_bytes())
                else:
                    self.assertFalse((workspace / '.frontend-architect').exists())

    def test_fixed_commit_survives_a_moved_tag_and_git_errors_are_not_empty_diffs(self):
        import shutil
        case = {'id':'fixed-review-baseline', 'task_type':'review', 'fixture':'evals/fixtures/community-review'}
        workspace = initialize_workspace(case, 'baseline')
        self.addCleanup(shutil.rmtree, workspace)
        baseline = subprocess.run(['git','rev-parse','HEAD'], cwd=workspace, check=True,
                                  capture_output=True, text=True).stdout.strip()
        source = workspace/'after/src/community/lifecycle.mjs'
        source.write_text(source.read_text() + '\n// unauthorized change\n')
        subprocess.run(['git','add','.'], cwd=workspace, check=True)
        subprocess.run(['git','commit','--quiet','-m','Change snapshot'], cwd=workspace, check=True)
        subprocess.run(['git','tag','-f','eval-fixture-base'], cwd=workspace, check=True, capture_output=True)
        self.assertEqual(validate_fixture(case, workspace, 5, baseline)[0]['exit_code'], 1)
        with self.assertRaises(subprocess.CalledProcessError):
            validate_fixture(case, workspace, 5, 'missing-base-ref')

    def test_review_snapshot_detects_tracked_and_untracked_changes(self) -> None:
        import shutil
        case = {'id': 'review-fixture-test', 'task_type': 'review', 'fixture': 'evals/fixtures/community-review'}
        workspace = initialize_workspace(case, 'baseline')
        self.addCleanup(shutil.rmtree, workspace)
        self.assertEqual(validate_fixture(case, workspace, 5)[0]['exit_code'], 0)
        source = workspace/'after/src/community/lifecycle.mjs'
        original = source.read_text()
        source.write_text(original + '\n// unexpected edit\n')
        self.assertEqual(validate_fixture(case, workspace, 5)[0]['exit_code'], 1)
        subprocess.run(['git', 'add', '.'], cwd=workspace, check=True)
        subprocess.run(['git', 'commit', '--quiet', '-m', 'Commit an unauthorized edit'], cwd=workspace, check=True)
        self.assertEqual(validate_fixture(case, workspace, 5)[0]['exit_code'], 1)
        source.write_text(original)
        self.assertEqual(validate_fixture(case, workspace, 5)[0]['exit_code'], 0)
        (workspace/'new-file.txt').write_text('Unexpected output')
        self.assertEqual(validate_fixture(case, workspace, 5)[0]['exit_code'], 1)

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
    def test_unfinished_items_are_unknown_even_after_a_valid_local_read(self):
        started = {'type':'item.started', 'item':{'id':'read-1', 'type':'command_execution',
                   'command':'cat /global/frontend-architect/SKILL.md'}}
        events = command_event('cat .frontend-architect/SKILL.md') + '\n' + json.dumps(started)
        audit = analyze_reference_reads(events, Path('/tmp/audit'))
        self.assertEqual(audit['read_audit_status'], 'unknown')
        completed = {**started, 'type':'item.completed', 'item':{**started['item'],
                     'exit_code':0, 'aggregated_output':'skill'}}
        audit = analyze_reference_reads(events + '\n' + json.dumps(completed), Path('/tmp/audit'))
        self.assertEqual(audit['read_audit_status'], 'recognized')
        self.assertFalse(audit['isolation_ok'])

    def test_reference_basename_requires_cwd_and_checks_its_location(self):
        event = json.loads(command_event("/bin/zsh -lc 'cat verification-and-review.md'"))
        workspace = Path('/tmp/audit')
        self.assertEqual(analyze_reference_reads(json.dumps(event), workspace)['read_audit_status'], 'unknown')
        for cwd, isolated in (('/global/frontend-architect/references', False),
                              ('/tmp/audit/.frontend-architect/references', True)):
            with self.subTest(cwd=cwd):
                event['item']['cwd'] = cwd
                audit = analyze_reference_reads(json.dumps(event), workspace)
                self.assertEqual(audit['read_audit_status'], 'recognized')
                self.assertEqual(audit['files'], ['verification-and-review.md'])
                self.assertEqual(audit['isolation_ok'], isolated)

    def test_empty_event_stream_is_unknown(self):
        self.assertEqual(analyze_reference_reads('', Path('/tmp/audit'))['read_audit_status'], 'unknown')

    def test_metadata_commands_never_establish_reading(self) -> None:
        for command in ("ls .frontend-architect/SKILL.md", "stat .frontend-architect/SKILL.md", "rg --files .frontend-architect",
                        "find .frontend-architect -type f -print",
                        "find .frontend-architect/references -maxdepth 1 -type f -print",
                        "find .frontend-architect -maxdepth 3 -type f -print",
                        "find . -maxdepth 2 -type d -not -path './.frontend-architect*'",
                        "pwd && rg --files -g '!.frontend-architect/**' && git status --short",
                        "git diff --name-only -- .frontend-architect",
                        "git status --short --ignored -- .frontend-architect",
                        "git status --short && git log --oneline -5 && find . -maxdepth 3 -type f -not -path './.frontend-architect/*' -print",
                        "ls -la && find . -maxdepth 4 -type f -not -path './.frontend-architect/*' -not -path './.git/*' -print"):
            with self.subTest(command=command):
                result = analyze_reference_reads(command_event(command), Path('/tmp/audit'))
                self.assertFalse(result['local_skill_read'])
                self.assertEqual(result['files'], [])
                self.assertEqual(result['read_audit_status'], 'recognized')

    def test_project_search_exclusions_do_not_establish_guidance_reads(self):
        workspace = Path('/tmp/audit')
        safe = "rg -n 'featureFlags|FeatureFlag' . --glob '!node_modules/**' --glob '!.frontend-architect/**'"
        result = analyze_reference_reads(command_event(safe), workspace)
        self.assertEqual(result['read_audit_status'], 'recognized')
        self.assertFalse(result['local_skill_read'])
        self.assertEqual(result['files'], [])
        unsafe = (
            safe.replace(' . ', ' /global/frontend-architect '),
            safe.replace("'featureFlags|FeatureFlag'", 'featureFlags|cat'),
            safe + ' && cat .frontend-architect/SKILL.md',
            safe + ' > .frontend-architect/SKILL.md',
            safe.replace("'featureFlags|FeatureFlag'", '"$(cat .frontend-architect/SKILL.md)"'),
            safe.replace(' . ', ' . --follow '),
        )
        for command in unsafe:
            with self.subTest(command=command):
                self.assertEqual(analyze_reference_reads(command_event(command), workspace)['read_audit_status'], 'unknown')
        event = json.loads(command_event(safe))
        event['item']['cwd'] = '/global/frontend-architect'
        self.assertEqual(analyze_reference_reads(json.dumps(event), workspace)['read_audit_status'], 'unknown')

    def test_empty_literal_git_diff_does_not_establish_a_guidance_read(self):
        event = json.loads(command_event('git diff -- .frontend-architect package.json'))
        event['item']['aggregated_output'] = ''
        result = analyze_reference_reads(json.dumps(event), Path('/tmp/audit'))
        self.assertEqual(result['read_audit_status'], 'recognized')
        self.assertFalse(result['local_skill_read'])
        event['item']['aggregated_output'] = 'diff --git a/.frontend-architect/SKILL.md b/.frontend-architect/SKILL.md\n-guidance'
        self.assertEqual(analyze_reference_reads(json.dumps(event), Path('/tmp/audit'))['read_audit_status'], 'unknown')
        event['item']['aggregated_output'] = ''
        event['item']['command'] = 'git diff -- .frontend-architect > output.txt'
        self.assertEqual(analyze_reference_reads(json.dumps(event), Path('/tmp/audit'))['read_audit_status'], 'unknown')

    def test_ambiguous_guidance_access_is_unknown_not_zero_read_success(self) -> None:
        commands = (
            'cat .frontend-architect/references/*.md',
            'cat .frontend-architect/SKILL.md && cat "$other"',
            'python -c "open(\'.frontend-architect/SKILL.md\').read()"',
            'cat .frontend-architect/references/$topic.md',
            "sed -n '1,20p' .frontend-architect/SKILL.md",
            'cat .frontend-architect/SKILL.md > /dev/null',
            'find .frontend-architect -type f -exec cat {} +',
            'find .frontend-architect -fprint /tmp/guidance-list',
            'find .frontend-architect -delete',
            'pwd && cat .frontend-architect/SKILL.md',
            'rg --files .frontend-architect && python read_guidance.py',
            'git diff --name-only --output=.frontend-architect/SKILL.md',
            'git diff --name-only -- .frontend-architect/$topic',
            'git log --oneline -p -- .frontend-architect',
            'find . -not -path "$filter" .frontend-architect',
        )
        for command in commands:
            with self.subTest(command=command):
                result = analyze_reference_reads(command_event(command), Path('/tmp/audit'))
                self.assertEqual(result['read_audit_status'], 'unknown')
                self.assertTrue(result['unknown_reads'])
                self.assertFalse(result['local_skill_read'])

    def test_failed_or_empty_commands_do_not_count_as_reads(self) -> None:
        for code, output in ((1, 'partial contents'), (0, ''), (None, 'contents')):
            event = json.loads(command_event('cat .frontend-architect/SKILL.md'))
            event['item'].update(exit_code=code, aggregated_output=output)
            result = analyze_reference_reads(json.dumps(event), Path('/tmp/audit'))
            self.assertFalse(result['local_skill_read'])
            self.assertEqual(result['read_audit_status'], 'unknown')

    def test_shell_wrapper_and_multiple_literal_paths_are_recognized(self) -> None:
        event = command_event("/bin/zsh -lc 'cat .frontend-architect/SKILL.md .frontend-architect/references/architecture-and-code.md'")
        result = analyze_reference_reads(event, Path('/tmp/audit'))
        self.assertTrue(result['local_skill_read'])
        self.assertEqual(result['files'], ['architecture-and-code.md'])
        self.assertEqual(result['read_audit_status'], 'recognized')

    def test_traversal_does_not_count_as_local_guidance(self) -> None:
        event = command_event('cat .frontend-architect/references/../../outside/references/architecture-and-code.md')
        result = analyze_reference_reads(event, Path('/tmp/audit'))
        self.assertFalse(result['isolation_ok'])

    def test_malformed_or_unrecognized_tool_events_remain_unknown(self) -> None:
        for event in ('not json', json.dumps({'type':'item.completed', 'item':{'type':'mcp_tool_call', 'arguments':{'path':'.frontend-architect/SKILL.md'}}})):
            result = analyze_reference_reads(event, Path('/tmp/audit'))
            self.assertEqual(result['read_audit_status'], 'unknown')

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

    def test_flags_more_than_two_routed_topics_for_review(self) -> None:
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
        self.assertTrue(result["breadth_review_required"])
        self.assertTrue(routing_capture_valid(result))

    def test_flags_more_than_one_rendering_platform_extension_for_review(self) -> None:
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
        self.assertTrue(result["breadth_review_required"])
        self.assertTrue(routing_capture_valid(result))

    def test_rejects_platform_extension_without_common_rendering_reference(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            events = command_event(
                "cat .frontend-architect/references/rendering-mini-program.md"
            )

            result = analyze_reference_reads(events, workspace)

        self.assertFalse(result["rendering_route_ok"])
        self.assertFalse(result["breadth_ok"])

        self.assertFalse(routing_capture_valid(result))

    def test_preserves_legacy_breadth_failure(self) -> None:
        self.assertFalse(routing_capture_valid({"breadth_ok": False}))


class TimeoutOutputTests(unittest.TestCase):
    def test_timeout_output_can_be_persisted_even_with_partial_utf8(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            error = subprocess.TimeoutExpired('command', 1, output=b'partial \xe4', stderr=b'error\xff')
            with patch('run_behavior_evals.subprocess.run', side_effect=error):
                result = run_command(['command'], cwd=root, timeout=1)
            (root/'events.jsonl').write_text(result['stdout'], encoding='utf-8')
            (root/'stderr.log').write_text(result['stderr'], encoding='utf-8')
            self.assertEqual(result['exit_code'], 124)
            self.assertTrue(result['stdout'].startswith('partial'))
            self.assertIn('\ufffd', result['stdout'])

    def test_real_timeout_with_stdout_preserves_text(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            result = run_command([sys.executable, '-c', 'import time; print("ready", flush=True); time.sleep(10)'], cwd=Path(temporary), timeout=1)
            self.assertEqual(result['exit_code'], 124)
            self.assertIn('ready', result['stdout'])
            self.assertIsInstance(result['stderr'], str)


if __name__ == "__main__":
    unittest.main()
