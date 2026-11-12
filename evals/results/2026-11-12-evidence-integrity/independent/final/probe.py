import argparse, contextlib, copy, hashlib, io, json, os, re, shlex, shutil, subprocess, sys
from pathlib import Path
from unittest.mock import patch
import yaml
sys.path.insert(0, '/Users/heguangwei/project/skills/frontend-architect-skill/scripts')
import run_behavior_evals as runner
import score_behavior_evals as scorer
from test_support import passing_audit

BASE = Path('/tmp/fa-integrity-independent-20261112/final')
ROOT = BASE/'source'
ROOT.mkdir(exist_ok=True)
(ROOT/'references').mkdir(exist_ok=True)
(ROOT/'SKILL.md').write_text('Read the fixture. Deliver only the requested state change.\n')
(ROOT/'CONTRIBUTING.md').write_text('Use the supported checks.\n')
(ROOT/'fixture').mkdir(exist_ok=True)
(ROOT/'fixture/state.txt').write_text('0')
(ROOT/'fixture/check.py').write_text("from pathlib import Path\nassert Path('state.txt').read_text() == '1', 'state transition missing'\nprint('accepted actual state=1')\n")
(ROOT/'evals').mkdir(exist_ok=True)
case = {'id':'independent', 'prompt':'Change state from 0 to 1.', 'fixture':'fixture',
        'protected_paths':['check.py'], 'validation_commands':[shlex.quote(sys.executable)+' check.py'],
        'applicable_dimensions':['verification_evidence'], 'fail_if':['Invented verification']}
(ROOT/'evals/cases.yaml').write_text(yaml.safe_dump({'cases':[case]}))
(ROOT/'evals/rubric.md').write_text('Score captured verification and actual code.')
generator = BASE/'generator.py'
generator.write_text('''import json,sys
from pathlib import Path
prompt=sys.stdin.read()
repair='HOST FEEDBACK AFTER YOUR PREVIOUS DELIVERY:' in prompt
print(json.dumps({'type':'item.completed','item':{'type':'command_execution','command':'cat .frontend-architect/SKILL.md','exit_code':0,'aggregated_output':Path('.frontend-architect/SKILL.md').read_text()}}))
if repair or sys.argv[2] == 'direct': Path('state.txt').write_text('1')
Path(sys.argv[1]).write_text('Repair delivered; host checks pending.' if repair else 'First delivery; host checks pending.')
print(json.dumps({'type':'turn.completed'}))
''')
real_run=subprocess.run

def local_run(command, **kwargs):
    if command==['codex','--version']:
        return subprocess.CompletedProcess(command,0,'local-fake-generator','')
    return real_run(command,**kwargs)

def capture(name, direct=False):
    results=BASE/name
    args=argparse.Namespace(case_ids=None,mode='candidate',model='local-test',reasoning_effort='medium',
                           results_dir=results,timeout_seconds=10,append=False,host_feedback=True)
    out=io.StringIO()
    with patch.object(runner,'ROOT',ROOT), patch.object(runner,'load_cases',return_value=[copy.deepcopy(case)]), \
         patch.object(runner,'parse_args',return_value=args), patch.object(runner.subprocess,'run',side_effect=local_run), \
         patch.object(runner,'codex_command',side_effect=lambda a,w,o:[sys.executable,str(generator),str(o),'direct' if direct else 'repair']), \
         contextlib.redirect_stdout(out):
        code=runner.main()
    (results/'capture.stdout.log').write_text(out.getvalue())
    return results,code

seen=[]
def model(args,prompt,schema,output):
    seen.append({'schema':schema.name,'prompt':prompt})
    ids=re.findall(r'^id: (.+)$',prompt,re.MULTILINE)
    if schema.name=='failure-schema.json':
        raw={'audits':[passing_audit(i) for i in ids]}
    else:
        raw={'evaluations':[{'id':i,'dimensions':[{'key':'verification_evidence','score':2,'reason':'Probe fixture'}],
                             'global_failures':[],'evidence_limits':[]} for i in ids]}
    output.write_text(json.dumps(raw))
    return subprocess.CompletedProcess([],0,'','')

def score(results):
    args=argparse.Namespace(results_dir=results,cases_file=ROOT/'evals/cases.yaml',model='local-test',
        reasoning_effort='medium',mode='candidate',case_ids=None,batch_size=1,timeout_seconds=10,force=False)
    seen.clear()
    out=io.StringIO()
    with patch.object(scorer,'ROOT',ROOT),patch.object(scorer,'parse_args',return_value=args), \
         patch.object(scorer,'run_score',side_effect=model),contextlib.redirect_stdout(out):
        code=scorer.main()
    saved=json.loads((results/'blind-scores/scores.json').read_text())['conditions']['candidate'][0]
    return {'exit':code,'model_calls':len(seen),'verdict':saved['verdict'],'invalid_reasons':saved.get('invalid_reasons',[]),
            'stdout':out.getvalue(),'quality_prompt_contains_mutation':any('INDEPENDENT_TAMPER' in item['prompt'] for item in seen)}

report={}
for name,direct in [('direct',True),('repair',False)]:
    results,code=capture(name,direct)
    record=json.loads((results/'manifest.json').read_text())['cases'][0]
    folder=results/'independent/candidate'
    report[name]={'capture_exit':code,'attempts':len(record['attempts']),
        'validation_exit_codes':[[v['exit_code'] for v in a['validations']] for a in record['attempts']],
        'final_state':json.loads((folder/'project-final.json').read_text())['files']['state.txt']['text'],
        'first_score':score(results),'cached_score':score(results)}
    shutil.rmtree(record['workspace'])
    report[name]['archived_score']=score(results)
    with patch.object(scorer,'ROOT',ROOT):
        report[name]['archived_evidence_errors']=scorer.captured_evidence_errors(record,case,folder)

pristine=BASE/'repair'
for name,relative in [('response','response.md'),('diff','changes.diff'),('validation_log','validation-2.log'),
                      ('attempt_response','attempts/0/response.md'),('guidance_integrity','attempts/0/guidance-integrity.json')]:
    result=BASE/('tamper-'+name)
    shutil.copytree(pristine,result)
    folder=result/'independent/candidate'
    (folder/relative).write_text('INDEPENDENT_TAMPER favorable replacement\n')
    manifest=json.loads((result/'manifest.json').read_text())
    with patch.object(scorer,'ROOT',ROOT):
        errors=scorer.captured_evidence_errors(manifest['cases'][0],case,folder)
    report['tamper-'+name]={'evidence_errors':errors,'score':score(result)}

# Alter the manifest summary of round 0 while leaving raw preserved files intact.
result=BASE/'tamper-attempt-summary';shutil.copytree(pristine,result)
manifest=json.loads((result/'manifest.json').read_text())
manifest['cases'][0]['attempts'][0]['validations'][-1]['exit_code']=0
(result/'manifest.json').write_text(json.dumps(manifest))
with patch.object(scorer,'ROOT',ROOT):
    errors=scorer.captured_evidence_errors(manifest['cases'][0],case,result/'independent/candidate')
report['tamper-attempt-summary']={'evidence_errors':errors,'score':score(result)}

(BASE/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
