"""Uniformly audit immutable v7 captures with v8, then freshly grade both conditions."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,sys,time
R=Path(__file__).resolve().parents[1];P=json.loads((R/'run-plan.json').read_text());STAGE=Path(P['followupStage']);T=R/'audit-repair'
sys.path.insert(0,str(STAGE/'candidate/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
ENV={**os.environ,'PATH':str(STAGE/'bin')+os.pathsep+os.environ['PATH']}
while not (R/'execution/outcomes.json').is_file():time.sleep(5)
if T.exists():raise SystemExit('Canonical result root exists; refusing to replace grades')
for condition in ('previous','candidate'):
    manifests=list((R/condition).glob('shard-*/batch-*/manifest.json'))
    ids=[rec['id']for path in manifests for rec in json.loads(path.read_text())['cases']]
    if sorted(ids)!=sorted(P['cases']):raise SystemExit('Initial capture coverage incomplete: '+condition)
T.mkdir();receipts=[];hashes={}
for condition in ('previous','candidate'):
    shutil.copytree(R/condition,T/condition,ignore=shutil.ignore_patterns('blind-scores','scoring.log'))
    for file in (T/condition).rglob('*'):
        if not file.is_file() or file.name=='manifest.json':continue
        relative=file.relative_to(T); original=R/relative
        digest=hashlib.sha256(file.read_bytes()).hexdigest()
        assert digest==hashlib.sha256(original.read_bytes()).hexdigest(),str(relative)
        hashes[str(relative)]=digest
    for path in sorted((T/condition).glob('shard-*/batch-*/manifest.json')):
        manifest=json.loads(path.read_text())
        for rec in manifest['cases']:
            folder=path.parent/rec['id']/rec['mode'];events=(folder/'events.jsonl').read_text()
            assert hashlib.sha256(events.encode()).hexdigest()==rec['events_sha256']
            before=rec['reference_routing'];after=runner.analyze_reference_reads(events,Path(rec['workspace']));rec['reference_routing']=after
            receipts.append({'condition':condition,'id':rec['id'],'sourceManifest':str(path.relative_to(T)),'eventsSha256':rec['events_sha256'],'before':before,'after':after,'canonicalCaptureErrors':scorer.captured_evidence_errors(rec,runner.load_cases([rec['id']])[0],folder)})
        manifest['audit_migration']={'source':str(R/'audit-repair-protocol.json'),'revision':8,'rawEvidenceUnchanged':True}
        path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(T/'raw-evidence-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
(T/'audit-migration.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'phase':'canonical-audit-complete','records':len(receipts),'invalid':sum(bool(r['canonicalCaptureErrors'])for r in receipts)}),flush=True)
jobs=[]
for index,ids in enumerate(P['shards'],1):
    for n in range(1,(len(ids)+3)//4+1):
        for condition in ('previous','candidate'):jobs.append((condition,index,n,T/condition/('shard-'+str(index))/('batch-'+str(n))))
def grade(job):
    condition,index,batch,folder=job
    cmd=[sys.executable,str(STAGE/condition/'scripts/score_behavior_evals.py'),'--results-dir',str(folder),'--mode','candidate','--batch-size','4','--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['scoring_timeout_seconds'])]
    with (folder/'scoring.log').open('w')as stream:
        stream.write('COMMAND: '+repr(cmd)+'\n');stream.flush();done=subprocess.run(cmd,stdout=stream,stderr=subprocess.STDOUT,env=ENV);stream.write('\nEXIT: '+str(done.returncode)+'\n')
    row={'phase':'canonical-scored','condition':condition,'shard':index,'batch':batch,'exitCode':done.returncode};print(json.dumps(row),flush=True);return row
start=time.time();outcomes=[]
with ThreadPoolExecutor(max_workers=3)as pool:
    for future in as_completed([pool.submit(grade,j)for j in jobs]):
        try:outcomes.append(future.result())
        except Exception as e:outcomes.append({'error':repr(e)})
(T/'outcomes.json').write_text(json.dumps({'elapsedSeconds':round(time.time()-start,1),'jobs':outcomes,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
