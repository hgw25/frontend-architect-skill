import argparse, copy, contextlib, hashlib, io, json, re, shutil, subprocess, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, '/Users/heguangwei/project/skills/frontend-architect-skill/scripts')
import yaml
import run_behavior_evals as runner
import score_behavior_evals as scorer
from test_support import passing_audit
BASE=Path('/tmp/fa-integrity-independent-20261112/after')
ROOT=BASE/'source'
case=yaml.safe_load((ROOT/'evals/cases.yaml').read_text())['cases'][0]
report={}

def check(name,change):
    result=BASE/name;shutil.copytree(BASE/'repair',result)
    path=result/'manifest.json';manifest=json.loads(path.read_text());record=manifest['cases'][0]
    change(manifest,record)
    path.write_text(json.dumps(manifest))
    args=argparse.Namespace(results_dir=result,cases_file=ROOT/'evals/cases.yaml',model='local-test',reasoning_effort='medium',mode='candidate',case_ids=None,batch_size=1,timeout_seconds=10,force=False)
    calls=[]
    def model(a,p,s,o):
        calls.append(s.name)
        ids=re.findall(r'^id: (.+)$',p,re.MULTILINE)
        raw={'audits':[passing_audit(i) for i in ids]} if s.name=='failure-schema.json' else {'evaluations':[{'id':i,'dimensions':[{'key':'verification_evidence','score':2,'reason':'local probe'}],'global_failures':[],'evidence_limits':[]} for i in ids]}
        o.write_text(json.dumps(raw));return subprocess.CompletedProcess([],0,'','')
    with patch.object(scorer,'ROOT',ROOT),patch.object(scorer,'parse_args',return_value=args),patch.object(scorer,'run_score',side_effect=model),contextlib.redirect_stdout(io.StringIO()):
        errors=scorer.captured_evidence_errors(record,case,result/'independent/candidate')
        code=scorer.main()
    verdict=json.loads((result/'blind-scores/scores.json').read_text())['conditions']['candidate'][0]
    report[name]={'evidence_errors':errors,'score_exit':code,'model_calls':len(calls),'verdict':verdict['verdict']}

check('guidance-manifest-source-identity',lambda manifest,record:manifest['guidance_sha256'].pop('CONTRIBUTING.md'))
check('guidance-missing-round-summary',lambda manifest,record:record['guidance_checks'].pop(0))
check('guidance-round-summary-mismatch',lambda manifest,record:record['attempts'][0]['guidance_checks'][0]['after_sha256'].update({'SKILL.md':'incorrect digest'}))
check('guidance-missing-attempts',lambda manifest,record:record.pop('attempts'))
(BASE/'guidance-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
