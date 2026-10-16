"""First score of the same recovery after a proven non-guidance audit correction."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys
RESULTS=Path(__file__).resolve().parents[1]
PLAN=json.loads((RESULTS/'run-plan.json').read_text());STAGE=Path(PLAN['followupStage'])
sys.path.insert(0,str(STAGE/'previous/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
source=RESULTS/'capture-recovery/previous/accessible-dialog-primitive'
target=RESULTS/'capture-recovery-audit8.1/previous/accessible-dialog-primitive'
shutil.copytree(source,target,ignore=shutil.ignore_patterns('blind-scores','scoring.log'))
manifest=json.loads((target/'manifest.json').read_text());record=manifest['cases'][0]
folder=target/record['id']/record['mode'];events=(folder/'events.jsonl').read_text()
record['reference_routing']=runner.analyze_reference_reads(events,Path(record['workspace']))
assert not scorer.captured_evidence_errors(record,runner.load_cases([record['id']])[0],folder)
assert any(v['exit_code']!=0 for v in record['validations'])
manifest['audit_correction']={'implementation':'8.1','source':str(source/'manifest.json'),'sameGeneration':True,'newModelGeneration':False,'protocol':str(RESULTS/'audit-8.1-protocol.json')}
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
hashes={}
for file in target.rglob('*'):
    if not file.is_file()or file.name=='manifest.json':continue
    relative=file.relative_to(target);digest=hashlib.sha256(file.read_bytes()).hexdigest()
    assert digest==hashlib.sha256((source/relative).read_bytes()).hexdigest();hashes[str(relative)]=digest
(target/'raw-evidence-check.json').write_text(json.dumps(hashes,indent=2)+'\n')
command=[sys.executable,str(STAGE/'previous/scripts/score_behavior_evals.py'),'--results-dir',str(target),'--mode','candidate','--batch-size','1','--model',PLAN['model'],'--reasoning-effort',PLAN['reasoning_effort'],'--timeout-seconds',str(PLAN['scoring_timeout_seconds'])]
with(target/'scoring.log').open('w')as stream:
    stream.write('COMMAND: '+repr(command)+'\n');stream.flush();done=subprocess.run(command,stdout=stream,stderr=subprocess.STDOUT,env={**os.environ,'PATH':str(STAGE/'bin')+os.pathsep+os.environ['PATH']});stream.write('\nEXIT: '+str(done.returncode)+'\n')
print(json.dumps({'scoringExit':done.returncode,'sameGeneration':True,'folder':str(target.relative_to(RESULTS))}))
