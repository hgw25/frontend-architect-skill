import copy
import hashlib
import json
import subprocess
import argparse
import shlex
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import score_behavior_evals as scorer
from eval_evidence import project_snapshot, project_context, resolve_acceptance, save_snapshot, snapshot_errors
from run_behavior_evals import build_prompt
import run_behavior_evals as runner
from test_support import passing_audit


class ProjectEvidenceTests(unittest.TestCase):
    def test_final_snapshot_matches_files_produced_by_the_executed_host_check(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            workspace = root/'workspace'
            workspace.mkdir()
            subprocess.run(['git','init','--quiet'], cwd=workspace, check=True)
            subprocess.run(['git','config','user.name','Eval'], cwd=workspace, check=True)
            subprocess.run(['git','config','user.email','eval@example.invalid'], cwd=workspace, check=True)
            (workspace/'README.md').write_text('Contract')
            subprocess.run(['git','add','.'], cwd=workspace, check=True)
            subprocess.run(['git','commit','--quiet','-m','fixture'], cwd=workspace, check=True)
            generator = root/'generator.py'
            generator.write_text("import sys\nfrom pathlib import Path\nPath(sys.argv[1]).write_text('Submitted')\nprint('{}')\n")
            build = root/'build.py'
            build.write_text("from pathlib import Path\nPath('public.js').write_text('export const value = 1')\n")
            with patch.object(runner,'codex_command', side_effect=lambda a,w,o:[sys.executable,str(generator),str(o)]):
                result = runner.capture_attempt(argparse.Namespace(timeout_seconds=10),
                    {'validation_commands':[shlex.quote(sys.executable)+' '+shlex.quote(str(build))]},
                    workspace,'HEAD',root/'record','Task')
            self.assertEqual(result['validations'][0]['exit_code'],0)
            snapshot = json.loads((root/'record/project-final.json').read_text())
            self.assertEqual(snapshot['files']['public.js']['text'], 'export const value = 1')

    def test_freezes_unchanged_contract_callers_and_new_delivery_without_dependencies(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            subprocess.run(['git', 'init', '--quiet'], cwd=root, check=True)
            (root/'.gitignore').write_text('node_modules/\n')
            (root/'README.md').write_text('Authoritative contract: keep the accepted receipt visible.\n')
            (root/'caller.ts').write_text('export const caller = owner(command)\n' + 'x'*3000)
            subprocess.run(['git', 'add', '.'], cwd=root, check=True)
            before = project_snapshot(root)
            (root/'node_modules').mkdir()
            (root/'node_modules/private.txt').write_text('Not project context')
            (root/'DESIGN.md').write_text('Actual contract and executed checks.\n')
            (root/'deleted.ts').write_text('obsolete')
            subprocess.run(['git', 'add', 'deleted.ts'], cwd=root, check=True)
            (root/'deleted.ts').unlink()
            final = project_snapshot(root)
            self.assertNotIn('deleted.ts', final['files'])
            self.assertNotIn('node_modules/private.txt', final['files'])
            self.assertIn('DESIGN.md', final['files'])
            save_snapshot(root/'project-input.json', before)
            digest = save_snapshot(root/'project-final.json', final)
            context = project_context(root)
            self.assertIn('Authoritative contract', context)
            self.assertIn('caller = owner(command)', context)
            self.assertIn('Actual contract and executed checks.', context)
            self.assertEqual(snapshot_errors(root/'project-final.json', digest), [])
            (root/'project-final.json').write_text('{}')
            self.assertTrue(snapshot_errors(root/'project-final.json', digest))

    def test_snapshot_must_match_original_fixture_not_the_models_redescription(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/'project-input.json'
            content = 'Changed contract'
            digest = save_snapshot(path, {'version':1,'files':{'README.md':{
                'sha256':hashlib.sha256(content.encode()).hexdigest(), 'size':len(content), 'text':content}}})
            self.assertTrue(snapshot_errors(path, digest, {'README.md':'original-hash'}))
            self.assertTrue(snapshot_errors(path, None))

    def test_early_checks_and_sed_reads_are_not_lost_by_log_tail_selection(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            commands = [('node cost.mjs', 'ORIGINAL_BASELINE')]
            commands += [("sed -n '1,300p' src/app.mjs", 'CALLER'+ 'x'*2100)]
            commands += [('git status --short', '')]*30
            (folder/'events.jsonl').write_text('\n'.join(json.dumps({'type':'item.completed','item':{
                'type':'command_execution','command':command,'exit_code':0,'aggregated_output':output}})
                for command, output in commands))
            evidence = scorer.generator_check_evidence(folder)
            self.assertIn('ORIGINAL_BASELINE', evidence)
            self.assertIn('CALLER', evidence)


class RequiredAcceptanceTests(unittest.TestCase):
    def test_required_omission_and_missing_evidence_override_perfect_quality(self):
        criterion = 'Original and final comparable measurements are retained.'
        cases = {'task': {'applicable_dimensions':['verification_evidence'], 'fail_if':[],
                          'acceptance_criteria':[criterion]}}
        for status in ('met', 'unmet', 'insufficient_evidence'):
            with self.subTest(status=status):
                audit = passing_audit('task', [criterion])
                audit['acceptance_results'][0].update(verdict=status, evidence='No original sample in recorded execution.')
                failures = scorer.validate_failure_audits({'audits':[audit]}, [{'id':'task'}], cases)
                scores = scorer.validate_and_normalize({'evaluations':[{
                    'id':'task','dimensions':[{'key':'verification_evidence','score':2,'reason':'Quality score'}],
                    'global_failures':[], 'evidence_limits':[]}]}, [{'id':'task'}], cases)
                final = scorer.finalize_evaluations(scores, failures)[0]
                self.assertEqual(final['verdict'], 'target' if status=='met' else 'fail')
                self.assertEqual(final['normalized_score'], 16)

    def test_missing_required_audit_is_rejected_instead_of_assumed_pass(self):
        cases = {'task': {'fail_if':[], 'acceptance_criteria':['Required contract']}}
        audit = passing_audit('task')
        with self.assertRaisesRegex(ValueError, 'Incomplete required acceptance'):
            scorer.validate_failure_audits({'audits':[audit]}, [{'id':'task'}], cases)
        del audit['requirements_review']
        with self.assertRaisesRegex(ValueError, 'Mandatory task contract'):
            scorer.validate_failure_audits({'audits':[audit]}, [{'id':'task'}], cases)

    def test_raw_requirement_violation_fails_without_a_case_specific_failure_rule(self):
        audit = passing_audit('task')
        audit['requirements_review'] = {'verdict':'unmet','reason':'README requires a receipt; final renderer erases it.'}
        failures = scorer.validate_failure_audits({'audits':[audit]}, [{'id':'task'}], {'task':{'fail_if':[]}})
        self.assertEqual(len(failures['task']), 1)

    def test_profiles_are_reused_only_when_applicable_and_never_sent_to_generator(self):
        profiles = {'design':['Saved connected design'], 'measurement':['Comparable baseline']}
        case = {'prompt':'Complete the request', 'acceptance_profiles':['design'], 'acceptance_criteria':['Actual outcome']}
        self.assertEqual(resolve_acceptance(case, profiles), ['Saved connected design','Actual outcome'])
        self.assertEqual(resolve_acceptance({'prompt':'Change label'}, profiles), [])
        prompt = build_prompt(case, 'candidate')
        for hidden in profiles['design']+case['acceptance_criteria']:
            self.assertNotIn(hidden, prompt)

    def test_only_failure_auditor_sees_required_outcomes_and_both_see_raw_contracts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            folder = root/'task/candidate'
            folder.mkdir(parents=True)
            content = 'Original consumer contract, independent of the model description.'
            snapshot = {'version':1,'files':{'README.md':{
                'sha256':hashlib.sha256(content.encode()).hexdigest(), 'size':len(content), 'text':content}}}
            save_snapshot(folder/'project-input.json', snapshot)
            save_snapshot(folder/'project-final.json', snapshot)
            record = {'id':'task','validations':[]}
            case = {'id':'task','prompt':'Complete the task','applicable_dimensions':['verification_evidence'],
                    'fail_if':[], '_required_outcomes':['PRIVATE ACCEPTANCE CRITERION']}
            quality = scorer.build_prompt('candidate',[record],{'task':case},root)
            audit = scorer.build_failure_prompt('candidate',[record],{'task':case},root)
            self.assertIn(content, quality)
            self.assertIn(content, audit)
            self.assertNotIn('PRIVATE ACCEPTANCE CRITERION', quality)
            self.assertIn('PRIVATE ACCEPTANCE CRITERION', audit)


if __name__ == '__main__':
    unittest.main()
