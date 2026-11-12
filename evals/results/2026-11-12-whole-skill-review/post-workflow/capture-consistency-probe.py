import argparse, contextlib, hashlib, io, json, os, shlex, shutil, subprocess, sys, tempfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, '/Users/heguangwei/project/skills/frontend-architect-skill/scripts')
import run_behavior_evals as runner
import score_behavior_evals as scorer

with tempfile.TemporaryDirectory(prefix='frontend-review-probe-') as temporary:
    root = Path(temporary)
    (root/'references').mkdir()
    (root/'SKILL.md').write_text('Frozen candidate guidance\n')
    (root/'CONTRIBUTING.md').write_text('Frozen maintenance guidance\n')
    fixture=root/'fixture'; fixture.mkdir()
    (fixture/'product.txt').write_text('Delivered product\n')
    (fixture/'check.py').write_text('assert True\n')
    (root/'oracle.py').write_text('assert True\n')
    case={'id':'probe','prompt':'Inspect the existing product','artifact':'', 'fixture':'fixture',
          'protected_paths':['check.py'], 'validation_commands':[shlex.quote(sys.executable)+' check.py'],
          'acceptance_checks':[{'name':'oracle', 'command':shlex.quote(sys.executable)+' checks/oracle.py',
                                'files':{'checks/oracle.py':'oracle.py'}}],
          'applicable_dimensions':['verification_evidence'], 'fail_if':['Invented evidence']}
    generator=root/'generator.py'
    generator.write_text('''import json, subprocess, sys
from pathlib import Path
sys.stdin.read()
for command in ['cat .frontend-architect/SKILL.md', 'git clean -fdx']:
    result=subprocess.run(command,shell=True,capture_output=True,text=True,check=True)
    print(json.dumps({'type':'item.completed','item':{'id':command,'type':'command_execution','command':command,'exit_code':0,'aggregated_output':result.stdout+result.stderr}}))
Path(sys.argv[1]).write_text('Inspected product; checks remain for the host.\\n')
print(json.dumps({'type':'turn.completed'}))
''')
    args=argparse.Namespace(case_ids=None,mode='candidate',model='local-probe',reasoning_effort='medium',
          results_dir=root/'results',timeout_seconds=10,append=False,host_feedback=False)
    real_run=subprocess.run
    def run(command, **kwargs):
        if command==['codex','--version']:
            return subprocess.CompletedProcess(command,0,'local-probe','')
        return real_run(command,**kwargs)
    with patch.object(runner,'ROOT',root), patch.object(runner,'load_cases',return_value=[case]), \
         patch.object(runner,'parse_args',return_value=args), \
         patch.object(runner,'codex_command',side_effect=lambda a,w,o:[sys.executable,str(generator),str(o)]), \
         patch.object(runner.subprocess,'run',side_effect=run), contextlib.redirect_stdout(io.StringIO()):
        code=runner.main()
    manifest=json.loads((args.results_dir/'manifest.json').read_text())
    record=manifest['cases'][0]
    workspace=Path(record['workspace']); case_dir=args.results_dir/'probe/candidate'
    with patch.object(scorer,'ROOT',root):
        before=scorer.captured_evidence_errors(record,case,case_dir)
        frozen=case_dir/'acceptance-inputs/oracle.py'
        frozen.write_text('raise RuntimeError("Changed saved support")\n')
        changed=scorer.captured_evidence_errors(record,case,case_dir)
        frozen.unlink()
        missing=scorer.captured_evidence_errors(record,case,case_dir)
    print(json.dumps({'capture_exit_code':code, 'local_skill_exists_after_capture':(workspace/'.frontend-architect/SKILL.md').exists(),
                      'read_audit_status':record['reference_routing']['read_audit_status'],
                      'local_skill_read':record['reference_routing']['local_skill_read'],
                      'capture_errors':runner.capture_errors(record), 'evidence_errors_before_support_change':before,
                      'evidence_errors_after_support_change':changed,
                      'evidence_errors_after_support_removal':missing},indent=2))
    shutil.rmtree(workspace)
