"""Exercise the real capture-to-score handoff without an external model service."""
import argparse
import contextlib
import io
import json
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml
import run_behavior_evals as runner
import score_behavior_evals as scorer


class CaptureScoringTests(unittest.TestCase):
    def test_both_modes_use_real_captured_evidence_and_reject_a_changed_fixture(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'references').mkdir()
            (root/'SKILL.md').write_text('Local skill')
            (root/'CONTRIBUTING.md').write_text('Local maintenance guidance')
            (root/'fixture').mkdir()
            (root/'fixture/check.py').write_text('assert True\n')
            (root/'evals').mkdir()
            case = {'id':'handoff', 'prompt':'Inspect the fixture', 'artifact':'',
                    'fixture':'fixture', 'protected_paths':['check.py'],
                    'validation_commands':[shlex.quote(sys.executable) + ' check.py'],
                    'applicable_dimensions':['verification_evidence'], 'fail_if':['Invented evidence']}
            (root/'evals/cases.yaml').write_text(yaml.safe_dump({'cases':[case]}))
            (root/'evals/rubric.md').write_text('Score actual verification evidence.')
            generator = root/'generator.py'
            generator.write_text('''import json, sys
from pathlib import Path
prompt = sys.stdin.read()
skill = Path('.frontend-architect/SKILL.md')
print(json.dumps({'type':'turn.started'}))
if skill.exists():
    item = {'id':'read-1', 'type':'command_execution', 'command':'cat .frontend-architect/SKILL.md'}
    print(json.dumps({'type':'item.started', 'item':item}))
    item.update(exit_code=0, aggregated_output=skill.read_text())
    print(json.dumps({'type':'item.completed', 'item':item}))
Path(sys.argv[1]).write_text('Fixture inspected.')
print(json.dumps({'type':'turn.completed'}))
''')
            results = root/'results'
            args = argparse.Namespace(case_ids=None, mode='both', model='test-model',
                    reasoning_effort='medium', results_dir=results, timeout_seconds=10, append=False)
            real_run = subprocess.run
            def run(command, **kwargs):
                if command == ['codex', '--version']:
                    return subprocess.CompletedProcess(command, 0, 'test-generator', '')
                return real_run(command, **kwargs)
            with patch.object(runner, 'ROOT', root), patch.object(runner, 'load_cases', return_value=[case]), \
                 patch.object(runner, 'parse_args', return_value=args), \
                 patch.object(runner, 'codex_command', side_effect=lambda a,w,o: [sys.executable, str(generator), str(o)]), \
                 patch.object(runner.subprocess, 'run', side_effect=run), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(runner.main(), 0)
            manifest = json.loads((results/'manifest.json').read_text())
            for record in manifest['cases']:
                self.addCleanup(shutil.rmtree, record['workspace'])
                self.assertEqual([v['exit_code'] for v in record['validations']], [0, 0])
            args.batch_size = 4
            args.force = False
            def score(a, prompt, schema, output):
                names = re.findall(r'^id: (.+)$', prompt, re.MULTILINE)
                if schema.name == 'failure-schema.json':
                    raw = {'audits':[{'id':name, 'triggered':[], 'routing_review':{'verdict':'not_required', 'reason':''}} for name in names]}
                else:
                    raw = {'evaluations':[{'id':name, 'dimensions':[{'key':'verification_evidence', 'score':2, 'reason':'captured checks'}], 'global_failures':[], 'evidence_limits':[]} for name in names]}
                output.write_text(json.dumps(raw))
                return subprocess.CompletedProcess([], 0, '', '')
            with patch.object(scorer, 'ROOT', root), patch.object(scorer, 'parse_args', return_value=args), \
                 patch.object(scorer, 'run_score', side_effect=score) as model, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(scorer.main(), 0)
                self.assertEqual(model.call_count, 4)
                self.assertEqual(scorer.main(), 0)
                self.assertEqual(model.call_count, 4)
                # Both modes must lose their old passing verdict before the first model call.
                args.force = True
                model.side_effect = subprocess.TimeoutExpired('codex', 10)
                with self.assertRaises(subprocess.TimeoutExpired):
                    scorer.main()
                states = json.loads((results/'blind-scores/scores.json').read_text())['conditions']
                self.assertEqual([states[m][0]['verdict'] for m in ('baseline','candidate')], ['invalid','invalid'])
                (root/'fixture/check.py').write_text('assert False\n')
                model.reset_mock()
                self.assertEqual(scorer.main(), 1)
                model.assert_not_called()
                states = json.loads((results/'blind-scores/scores.json').read_text())['conditions']
                self.assertTrue(all('contract changed' in ' '.join(states[m][0]['invalid_reasons']) for m in states))


if __name__ == '__main__':
    unittest.main()
