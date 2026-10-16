#!/usr/bin/env python3
"""Regression tests for behavior-evaluation verdict and failure handling."""

from __future__ import annotations

import argparse
import hashlib
import contextlib
import copy
import io
import re
import subprocess
from unittest.mock import patch

import yaml
import score_behavior_evals as scorer
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


class EvidenceProvenanceTests(unittest.TestCase):
    def test_self_check_failure_and_later_host_pass_keep_their_origins(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            folder = root / CASE_ID / 'candidate'
            folder.mkdir(parents=True)
            (folder / 'response.md').write_text('Browser self-check was blocked in the sandbox.')
            (folder / 'changes.diff').write_text('')
            (folder / 'validation-1.log').write_text('5 browser checks passed on the host')
            events = [
                {'type': 'item.completed', 'item': {'type': 'command_execution',
                 'command': 'npm run check', 'exit_code': 1, 'aggregated_output': 'sandbox launch blocked'}},
                {'type': 'item.completed', 'item': {'type': 'command_execution',
                 'command': 'npm ci && cat verification-and-review.md', 'exit_code': 0,
                 'aggregated_output': 'PRIVATE-GUIDANCE'}},
                {'type': 'item.completed', 'item': {'type': 'agent_message', 'text': 'PRIVATE-REASONING'}},
            ]
            (folder / 'events.jsonl').write_text('\n'.join(json.dumps(e) for e in events))
            record = {'id': CASE_ID, 'validations': [{'command': 'npm run check', 'exit_code': 0}]}
            cases = {CASE_ID: {**CASES[CASE_ID], 'id': CASE_ID, 'prompt': 'Fix the fixture'}}
            for prompt in (build_prompt('candidate', [record], cases, root),
                           build_failure_prompt('candidate', [record], cases, root)):
                self.assertIn('GENERATOR SELF-CHECKS', prompt)
                self.assertIn('sandbox launch blocked', prompt)
                self.assertIn('HOST VALIDATIONS', prompt)
                self.assertIn('5 browser checks passed on the host', prompt)
                self.assertNotIn('PRIVATE-GUIDANCE', prompt)
                self.assertNotIn('PRIVATE-REASONING', prompt)


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


class ScoringWorkflowTests(unittest.TestCase):
    """Exercise persisted runs and both scorer stages without making model calls."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.results = self.root / 'results'
        self.results.mkdir()
        (self.root/'evals').mkdir()
        self.cases = {
            name: {**copy.deepcopy(CASES[CASE_ID]), 'id': name, 'prompt': 'Review the change', 'artifact': 'code'}
            for name in ('first-case', 'second-case')
        }
        self.save_cases()
        (self.root/'evals/rubric.md').write_text('Score the supplied behavior.')
        self.records = []
        for name in self.cases:
            folder = self.results/name/'candidate'
            folder.mkdir(parents=True)
            (folder/'response.md').write_text('Review response')
            (folder/'changes.diff').write_text('')
            (folder/'events.jsonl').write_text(json.dumps({'type':'item.completed', 'item':{'type':'command_execution', 'command':'cat .frontend-architect/SKILL.md', 'exit_code':0, 'aggregated_output':'skill content'}}) + '\n' + json.dumps({'type':'turn.completed'}))
            self.records.append({
                'id': name, 'workspace': str(self.root/name), 'mode': 'candidate', 'generation': {'exit_code': 0}, 'validations': [],
                'reference_routing': {'local_skill_read': True, 'isolation_ok': True,
                    'skill_isolation_ok': True, 'read_audit_status': 'recognized',
                    'files': [], 'skill_paths': [], 'breadth_review_required': False},
            })
        for record in self.records:
            self.capture_record(record)
        self.save_manifest()
        self.args = argparse.Namespace(results_dir=self.results, model='test-model',
            reasoning_effort='medium', mode='candidate', case_ids=['first-case'],
            batch_size=4, timeout_seconds=5, force=False)

    def capture_record(self, record):
        events = (self.results/record['id']/record['mode']/'events.jsonl').read_text()
        record['events_sha256'] = hashlib.sha256(events.encode()).hexdigest()
        record['reference_routing'] = scorer.analyze_reference_reads(events, Path(record['workspace']))
        record['capture_contract'] = scorer.capture_contract(self.cases[record['id']], self.root)

    def save_cases(self) -> None:
        (self.root/'evals/cases.yaml').write_text(yaml.safe_dump({'cases': list(self.cases.values())}))

    def save_manifest(self) -> None:
        (self.results/'manifest.json').write_text(json.dumps({'cases': self.records}))

    def fake_score(self, args, prompt, schema, output):
        names = re.findall(r'^id: (.+)$', prompt, re.MULTILINE)
        if schema.name == 'failure-schema.json':
            data = {'audits': [{'id': name, 'triggered': [],
                'routing_review': {'verdict': 'justified', 'reason': 'Observed decision gap'}} for name in names]}
        else:
            data = {'evaluations': [{**raw_score()['evaluations'][0], 'id': name} for name in names]}
        output.write_text(json.dumps(data))
        return subprocess.CompletedProcess([], 0, '', '')

    def invoke(self):
        with patch.object(scorer, 'ROOT', self.root), patch.object(scorer, 'parse_args', return_value=self.args), patch.object(scorer, 'run_score', side_effect=self.fake_score) as call, contextlib.redirect_stdout(io.StringIO()):
            exit_code = scorer.main()
        saved = json.loads((self.results/'blind-scores/scores.json').read_text())
        return exit_code, call.call_count, saved['conditions']['candidate']

    def test_unchanged_evidence_reuses_both_stages(self) -> None:
        self.assertEqual(self.invoke()[1], 2)
        self.assertEqual(self.invoke()[1], 0)

    def test_raw_events_missing_changed_or_forged_summary_revoke_target(self):
        events = self.results/'first-case/candidate/events.jsonl'
        original = events.read_text()
        for scenario in ('missing', 'empty', 'polluted', 'digest-only', 'unfinished'):
            with self.subTest(scenario=scenario):
                events.write_text(original)
                self.capture_record(self.records[0])
                self.save_manifest()
                self.assertEqual(self.invoke()[2][0]['verdict'], 'target')
                if scenario == 'missing':
                    events.unlink()
                elif scenario == 'empty':
                    events.write_text('')
                elif scenario == 'unfinished':
                    events.write_text(original.splitlines()[0])
                    self.capture_record(self.records[0])
                else:
                    events.write_text(original.replace('.frontend-architect/SKILL.md', '/global/frontend-architect/SKILL.md'))
                    if scenario == 'digest-only':
                        self.records[0]['events_sha256'] = hashlib.sha256(events.read_bytes()).hexdigest()
                self.save_manifest()
                code, calls, scores = self.invoke()
                self.assertEqual((code, calls, scores[0]['verdict']), (1, 0, 'invalid'))

    def test_external_scoring_failure_never_preserves_selected_targets(self):
        self.args.case_ids = None
        self.invoke()
        original_score = self.fake_score
        for failure in ('returncode', 'timeout', 'bad-json', 'failure-audit'):
            with self.subTest(failure=failure):
                self.fake_score = original_score
                self.records[0]['generation']['exit_code'] = 0
                self.save_manifest()
                self.invoke()
                self.records[0]['generation']['exit_code'] = 1
                self.save_manifest()
                self.args.force = True
                def fail(args, prompt, schema, output):
                    if failure == 'timeout':
                        raise subprocess.TimeoutExpired('codex', 5)
                    if failure == 'bad-json':
                        output.write_text('{}')
                        return subprocess.CompletedProcess([], 0, '', '')
                    if failure == 'failure-audit' and schema.name != 'failure-schema.json':
                        return original_score(args, prompt, schema, output)
                    return subprocess.CompletedProcess([], 1, '', 'unavailable')
                self.fake_score = fail
                with self.assertRaises((SystemExit, subprocess.TimeoutExpired)):
                    self.invoke()
                saved = json.loads((self.results/'blind-scores/scores.json').read_text())['conditions']['candidate']
                self.assertEqual([s['verdict'] for s in saved], ['invalid', 'invalid'])
                self.assertIn('Generation did not complete successfully', saved[0]['invalid_reasons'])
                self.assertTrue(all('normalized_score' not in score for score in saved))

    def test_missing_selected_capture_revokes_prior_target(self):
        self.invoke()
        self.records = self.records[1:]
        self.save_manifest()
        self.assertEqual(self.invoke()[:2], (1, 0))
        self.assertEqual(self.invoke()[2][0]['verdict'], 'invalid')

    def test_changed_validation_contract_requires_recapture_and_execution(self):
        self.invoke()
        self.cases['first-case']['validation_commands'] = ['check-one', 'check-two']
        self.save_cases()
        self.assertEqual(self.invoke()[:2], (1, 0))
        self.capture_record(self.records[0])
        for commands, expected in [([], 'invalid'), (['check-one'], 'invalid'),
                                   (['check-two', 'check-one'], 'invalid'),
                                   (['check-one', 'check-two'], 'target')]:
            with self.subTest(commands=commands):
                self.records[0]['validations'] = [{'command':c, 'exit_code':0} for c in commands]
                for i in range(len(commands)):
                    (self.results/f'first-case/candidate/validation-{i+1}.log').write_text('passed')
                self.save_manifest()
                self.assertEqual(self.invoke()[2][0]['verdict'], expected)
        self.records[0]['validations'] = [{'command':'check-one', 'exit_code':1}]
        self.save_manifest()
        self.assertEqual(self.invoke()[2][0]['verdict'], 'fail')

    def test_fixture_content_change_requires_recapture_even_if_command_unchanged(self):
        fixture = self.root/'fixture'
        fixture.mkdir()
        check = fixture/'check.py'
        check.write_text('assert True')
        self.cases['first-case']['fixture'] = 'fixture'
        self.save_cases()
        self.capture_record(self.records[0])
        self.save_manifest()
        self.invoke()
        check.write_text('assert False')
        self.assertEqual(self.invoke()[:2], (1, 0))

    def test_changed_evidence_invalidates_both_cached_stages(self) -> None:
        folder = self.results/'first-case/candidate'
        changes = [
            lambda: (folder/'response.md').write_text('Different response'),
            lambda: (folder/'changes.diff').write_text('Different diff'),
            lambda: (self.root/'evals/rubric.md').write_text('Changed rubric'),
        ]
        self.invoke()
        for change in changes:
            change()
            with self.subTest(change=changes.index(change)):
                self.assertEqual(self.invoke()[1], 2)
                self.assertEqual(self.invoke()[1], 0)
        self.cases['first-case']['prompt'] = 'Revised request'
        self.save_cases()
        self.assertEqual(self.invoke()[:2], (1, 0))
        self.capture_record(self.records[0])
        self.save_manifest()
        self.assertEqual(self.invoke()[1], 2)
        self.cases['first-case']['fail_if'].append('New failure condition')
        self.save_cases()
        self.assertEqual(self.invoke()[1], 2)

    def test_validation_changes_regrade_and_failure_overrides_model_score(self) -> None:
        self.cases['first-case']['validation_commands'] = ['behavior test']
        self.save_cases()
        self.capture_record(self.records[0])
        self.records[0]['validations'] = [{'command': 'behavior test', 'exit_code': 0}]
        log = self.results/'first-case/candidate/validation-1.log'
        log.write_text('passed')
        self.save_manifest()
        self.invoke()
        log.write_text('new validation evidence')
        self.assertEqual(self.invoke()[1], 2)
        self.records[0]['validations'][0]['exit_code'] = 1
        self.save_manifest()
        code, calls, scores = self.invoke()
        self.assertEqual((code, calls), (0, 2))
        self.assertEqual(scores[0]['verdict'], 'fail')
        self.assertEqual(scores[0]['validation_failures'], ['behavior test'])

    def test_routing_evidence_changes_reaudit(self) -> None:
        events = self.results/'first-case/candidate/events.jsonl'
        text = events.read_text()
        for name in ('architecture-and-code.md', 'async-and-lifecycles.md', 'verification-and-review.md'):
            text = json.dumps({'type':'item.completed', 'item':{'type':'command_execution', 'command':f'cat .frontend-architect/references/{name}', 'exit_code':0, 'aggregated_output':'reference'}}) + '\n' + text
        events.write_text(text)
        self.capture_record(self.records[0])
        self.save_manifest()
        self.invoke()
        events.write_text(json.dumps({'type':'item.completed', 'item':{'type':'agent_message', 'text':'Different routing justification'}}) + '\n' + text)
        self.capture_record(self.records[0])
        self.save_manifest()
        self.assertEqual(self.invoke()[1], 2)

    def test_review_scoring_requires_frozen_context_and_invalidates_on_changes(self) -> None:
        self.cases['first-case']['task_type'] = 'review'
        self.records[0]['validations'] = [{'command':'verify review fixture unchanged', 'exit_code':0}]
        (self.results/'first-case/candidate/validation-1.log').write_text('unchanged')
        self.save_cases()
        self.capture_record(self.records[0])
        self.save_manifest()
        self.assertEqual(self.invoke()[:2], (1, 0))
        context = self.results/'first-case/candidate/review-context.md'
        context.write_text('FILE after/requirements.md\nApproved contract')
        self.assertEqual(self.invoke()[:2], (0, 2))
        for stage in ('candidate-1.prompt.txt', 'candidate-1.failures.prompt.txt'):
            self.assertIn('Approved contract', (self.results/'blind-scores'/stage).read_text())
        context.write_text('FILE after/requirements.md\nDifferent captured contract')
        self.assertEqual(self.invoke()[1], 2)

    def test_force_reruns_both_stages(self) -> None:
        self.invoke()
        self.args.force = True
        self.assertEqual(self.invoke()[1], 2)

    def test_legacy_cache_without_fingerprint_is_not_trusted(self) -> None:
        self.invoke()
        for stamp in (self.results/'blind-scores').glob('*.cache.json'):
            stamp.unlink()
        self.assertEqual(self.invoke()[1], 2)

    def test_tampered_cached_output_is_not_reused(self) -> None:
        self.invoke()
        output = self.results/'blind-scores/candidate-1.json'
        data = json.loads(output.read_text())
        data['evaluations'][0]['dimensions'][0]['score'] = 0
        output.write_text(json.dumps(data))
        self.assertEqual(self.invoke()[1], 1)

    def test_invalid_capture_replaces_prior_pass_without_model_calls(self) -> None:
        changes = [
            ('generation', 'exit_code', 1),
            ('reference_routing', 'local_skill_read', False),
            ('reference_routing', 'isolation_ok', False),
            ('reference_routing', 'skill_isolation_ok', False),
            ('reference_routing', 'read_audit_status', 'unknown'),
            ('reference_routing', 'read_audit_status', None),
            ('reference_routing', 'rendering_common_ok', False),
        ]
        original = copy.deepcopy(self.records[0])
        for group, key, value in changes:
            with self.subTest(field=key):
                self.records[0] = copy.deepcopy(original)
                self.save_manifest()
                self.invoke()
                self.records[0][group][key] = value
                if key == 'rendering_common_ok':
                    self.records[0]['reference_routing']['routing_policy_version'] = 2
                self.save_manifest()
                code, calls, scores = self.invoke()
                self.assertEqual((code, calls), (1, 0))
                self.assertEqual(scores[0]['verdict'], 'invalid')
                self.assertTrue(scores[0]['invalid_reasons'])
                self.assertNotIn('normalized_score', scores[0])

    def test_baseline_skill_reads_are_invalid(self) -> None:
        source = self.results/'first-case/candidate'
        source.rename(self.results/'first-case/baseline')
        self.records[0]['mode'] = 'baseline'
        self.records[0]['reference_routing']['skill_paths'] = ['.frontend-architect/SKILL.md']
        self.save_manifest()
        self.args.mode = 'baseline'
        with patch.object(scorer, 'ROOT', self.root), patch.object(scorer, 'parse_args', return_value=self.args), patch.object(scorer, 'run_score') as call:
            self.assertEqual(scorer.main(), 1)
            call.assert_not_called()

    def test_missing_evidence_is_invalid(self) -> None:
        (self.results/'first-case/candidate/response.md').unlink()
        code, calls, scores = self.invoke()
        self.assertEqual((code, calls), (1, 0))
        self.assertEqual(scores[0]['verdict'], 'invalid')

    def test_protected_harness_failure_is_invalid(self) -> None:
        self.records[0]['validations'] = [{'command': 'verify protected evaluation harness', 'exit_code': 1}]
        (self.results/'first-case/candidate/validation-1.log').write_text('modified test')
        self.save_manifest()
        self.assertEqual(self.invoke()[:2], (1, 0))

    def test_selective_scoring_appends_new_ids_and_preserves_old_scores(self) -> None:
        first = self.invoke()[2][0]
        self.args.case_ids = ['second-case']
        code, calls, scores = self.invoke()
        self.assertEqual((code, calls), (0, 2))
        self.assertEqual([score['id'] for score in scores], ['first-case', 'second-case'])
        self.assertEqual(scores[0], first)
        self.args.case_ids = ['first-case']
        self.assertEqual(len(self.invoke()[2]), 2)

    def test_failed_subprocess_cannot_leave_an_old_output(self) -> None:
        output = self.results/'stale-output.json'
        output.write_text('old successful response')
        with patch.object(scorer.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, '', 'failure')):
            completed = scorer.run_score(self.args, 'prompt', self.root/'schema.json', output)
        self.assertEqual(completed.returncode, 1)
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
