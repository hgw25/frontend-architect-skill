"""One recorded orchestration layer; frozen repository tools perform capture and blind scoring."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import datetime, json, os, subprocess, sys, threading, time
R=Path(__file__).resolve().parents[1]
P=json.loads((R/'run-plan.json').read_text()); STAGE=Path(P['stage'])
ENV={**os.environ,'PATH':str(STAGE/'bin')+os.pathsep+os.environ['PATH']}
LOCK=threading.Lock()
def event(data):
    data={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),**data}
    with LOCK:
        with (R/'execution/progress.jsonl').open('a') as f: f.write(json.dumps(data)+'\n')
        print(json.dumps(data),flush=True)
def execute(command,log):
    with log.open('w') as stream:
        stream.write('COMMAND: '+repr(command)+'\n'); stream.flush()
        done=subprocess.run(command,stdout=stream,stderr=subprocess.STDOUT,env=ENV)
        stream.write('\nEXIT: '+str(done.returncode)+'\n')
    return done.returncode
def worker(index,ids):
    outcome={'shard':index,'captures':[],'scoring':[]}
    for offset in range(0,len(ids),4):
        batch=ids[offset:offset+4]; n=offset//4+1
        for cid in batch:
            for condition in ('previous','candidate'):
                folder=R/condition/('shard-'+str(index))/('batch-'+str(n)); folder.mkdir(parents=True,exist_ok=True)
                cmd=[sys.executable,str(STAGE/condition/'scripts/run_behavior_evals.py'),'--case',cid,'--mode','candidate','--append','--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['generation_timeout_seconds']),'--results-dir',str(folder)]
                try:
                    code=execute(cmd,folder/(cid+'.capture.log'))
                    manifest=json.loads((folder/'manifest.json').read_text()); rec=next(r for r in manifest['cases'] if r['id']==cid)
                    data={'phase':'capture','shard':index,'batch':n,'condition':condition,'case':cid,'exit_code':code,'generation_exit':rec['generation']['exit_code'],'audit':rec['reference_routing']['read_audit_status'],'validations':[(v['command'],v['exit_code']) for v in rec['validations']]}
                except Exception as e:
                    data={'phase':'capture-error','shard':index,'condition':condition,'case':cid,'error':repr(e)}
                outcome['captures'].append(data); event(data)
        for condition in ('previous','candidate'):
            folder=R/condition/('shard-'+str(index))/('batch-'+str(n))
            cmd=[sys.executable,str(STAGE/condition/'scripts/score_behavior_evals.py'),'--results-dir',str(folder),'--mode','candidate','--batch-size','4','--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['scoring_timeout_seconds'])]
            code=execute(cmd,folder/'scoring.log')
            data={'phase':'scored','shard':index,'batch':n,'condition':condition,'exit_code':code}; outcome['scoring'].append(data); event(data)
    return outcome
if __name__=='__main__':
    start=time.time(); outcomes=[]
    with ThreadPoolExecutor(max_workers=P['concurrency']) as pool:
        futures=[pool.submit(worker,i,ids) for i,ids in enumerate(P['shards'],1)]
        for f in as_completed(futures):
            try: outcomes.append(f.result())
            except Exception as e: outcomes.append({'orchestration_error':repr(e)}); event(outcomes[-1])
    (R/'execution/outcomes.json').write_text(json.dumps({'elapsed_seconds':round(time.time()-start,1),'workers':outcomes},indent=2)+'\n')
    event({'phase':'suite-finished','elapsed_seconds':round(time.time()-start,1)})
