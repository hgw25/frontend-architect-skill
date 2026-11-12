import argparse,contextlib,io,json,re,shutil,subprocess,sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'/Users/heguangwei/project/skills/frontend-architect-skill/scripts')
import score_behavior_evals as scorer
from test_support import passing_audit
BASE=Path('/tmp/fa-integrity-independent-20261112/after')
ROOT=BASE/'source'
result=BASE/'archive-uncached';shutil.copytree(BASE/'repair',result)
shutil.rmtree(result/'blind-scores')
args=argparse.Namespace(results_dir=result,cases_file=ROOT/'evals/cases.yaml',model='local-test',reasoning_effort='medium',mode='candidate',case_ids=None,batch_size=1,timeout_seconds=10,force=False)
calls=[]
def model(a,p,s,o):
    calls.append(s.name)
    ids=re.findall(r'^id: (.+)$',p,re.MULTILINE)
    raw={'audits':[passing_audit(i) for i in ids]} if s.name=='failure-schema.json' else {'evaluations':[{'id':i,'dimensions':[{'key':'verification_evidence','score':2,'reason':'archived evidence'}],'global_failures':[],'evidence_limits':[]} for i in ids]}
    o.write_text(json.dumps(raw));return subprocess.CompletedProcess([],0,'','')
record=json.loads((result/'manifest.json').read_text())['cases'][0]
with patch.object(scorer,'ROOT',ROOT),patch.object(scorer,'parse_args',return_value=args),patch.object(scorer,'run_score',side_effect=model),contextlib.redirect_stdout(io.StringIO()):
    code=scorer.main()
score=json.loads((result/'blind-scores/scores.json').read_text())['conditions']['candidate'][0]
report={'workspace_exists':Path(record['workspace']).exists(),'scoring_cache_previously_removed':True,'exit':code,'model_calls':len(calls),'verdict':score['verdict']}
(BASE/'archive-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
