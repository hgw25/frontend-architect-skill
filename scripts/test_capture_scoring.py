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
    def test_host_feedback_does_not_retry_invalid_reading_or_modified_harness(self):
        for invalid_read in (True,False):
            with self.subTest(invalid_read=invalid_read), tempfile.TemporaryDirectory()as temporary:
                workspace=Path(temporary);folder=workspace/'results';folder.mkdir()
                args=argparse.Namespace(host_feedback=True)
                event={'type':'item.completed','item':{'type':'command_execution',
                       'command':'cat .frontend-architect/SKILL.md',
                       'exit_code':-1 if invalid_read else 0,'aggregated_output':'read result'}}
                def attempt(a,c,w,b,d,p):
                    d.mkdir(parents=True)
                    (d/'events.jsonl').write_text(json.dumps(event)+'\n')
                    (d/'response.md').write_text('Submitted')
                    return {'generation':{'exit_code':0,'duration_seconds':1},'validations':[
                        {'command':'verify protected evaluation harness'if not invalid_read else'node check.mjs',
                         'exit_code':1,'duration_seconds':0}]}
                with patch.object(runner,'capture_attempt',side_effect=attempt)as calls:
                    delivery,_=runner.capture_delivery(args,{'fixture':'fixture'},'candidate',workspace,'base',folder,'task')
                self.assertEqual(calls.call_count,1)
                self.assertEqual(len(delivery['attempts']),1)

    def test_host_feedback_preserves_first_delivery_and_stops_after_one_repair(self):
        for repair_succeeds in (True, False):
            with self.subTest(repair_succeeds=repair_succeeds), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                (root/'references').mkdir()
                (root/'SKILL.md').write_text('PRIVATE LOCAL GUIDANCE')
                (root/'CONTRIBUTING.md').write_text('maintenance')
                fixture = root/'fixture';fixture.mkdir()
                (fixture/'state.txt').write_text('0')
                (fixture/'check.py').write_text("from pathlib import Path\nassert Path('state.txt').read_text() == '1', 'state not accepted'\n")
                (root/'evals').mkdir()
                (root/'evals/rubric.md').write_text('Evaluate actual outcomes.')
                case = {'id':'feedback','prompt':'Implement state transition','artifact':'',
                        'fixture':'fixture','protected_paths':['check.py'],
                        'validation_commands':[shlex.quote(sys.executable)+' check.py'],
                        'applicable_dimensions':['verification_evidence'],'fail_if':['Invented evidence']}
                generator = root/'generator.py'
                generator.write_text('''import json,sys
from pathlib import Path
prompt=sys.stdin.read()
if 'HOST FEEDBACK AFTER YOUR PREVIOUS DELIVERY:' in prompt:
    assert 'state not accepted' in prompt
    Path('state.txt').write_text(sys.argv[2])
    response='Repair implemented; current host acceptance remains to be checked.'
else:
    response='Implementation submitted; host acceptance remains pending.'
skill=Path('.frontend-architect/SKILL.md')
print(json.dumps({'type':'item.completed','item':{'id':'read','type':'command_execution',
 'command':'cat .frontend-architect/SKILL.md','exit_code':0,'aggregated_output':skill.read_text()}}))
Path(sys.argv[1]).write_text(response)
print(json.dumps({'type':'turn.completed'}))
''')
                args=argparse.Namespace(case_ids=None,mode='candidate',model='test',reasoning_effort='high',
                    results_dir=root/'results',timeout_seconds=10,append=False,host_feedback=True)
                real_run=subprocess.run
                def run(command, **kwargs):
                    if command==['codex','--version']:
                        return subprocess.CompletedProcess(command,0,'test-generator','')
                    return real_run(command,**kwargs)
                with patch.object(runner,'ROOT',root), patch.object(runner,'load_cases',return_value=[case]), \
                     patch.object(runner,'parse_args',return_value=args), \
                     patch.object(runner,'codex_command',side_effect=lambda a,w,o:[sys.executable,str(generator),str(o),'1'if repair_succeeds else'0']) as calls, \
                     patch.object(runner.subprocess,'run',side_effect=run), contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(runner.main(),0 if repair_succeeds else 1)
                    self.assertEqual(calls.call_count,2)
                    record=json.loads((args.results_dir/'manifest.json').read_text())['cases'][0]
                    self.addCleanup(shutil.rmtree,record['workspace'])
                    folder=args.results_dir/'feedback/candidate'
                    self.assertEqual([a['validations'][-1]['exit_code']for a in record['attempts']],
                                     [1,0 if repair_succeeds else 1])
                    self.assertFalse((folder/'attempts/2').exists())
                    self.assertIn('host acceptance remains pending',(folder/'attempts/0/response.md').read_text())
                    self.assertIn('state not accepted',(folder/'attempts/0/validation-2.log').read_text())
                    with patch.object(scorer,'ROOT',root):
                        self.assertEqual(scorer.captured_evidence_errors(record,case,folder),[])
                        prompt=scorer.build_prompt('candidate',[record],{'feedback':case},args.results_dir)
                        self.assertIn('response_before_host_checks',prompt)
                        self.assertIn('state not accepted',prompt)
                        self.assertNotIn('PRIVATE LOCAL GUIDANCE',prompt)
                        (folder/'attempts/0/response.md').write_text('Overwritten favorable history')
                        self.assertTrue(any('attempt artifact changed'in e for e in scorer.captured_evidence_errors(record,case,folder)))
                    before=(args.results_dir/'manifest.json').read_bytes()
                    args.append=True
                    with self.assertRaisesRegex(SystemExit,'preserve attempts'):
                        runner.main()
                    self.assertEqual((args.results_dir/'manifest.json').read_bytes(),before)

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
