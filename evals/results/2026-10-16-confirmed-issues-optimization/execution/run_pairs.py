"""Fresh comparisons under one frozen audit/contract; never replace an attempt."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import datetime,json,os,subprocess,sys,time
R=Path(__file__).resolve().parents[1];P=json.loads((R/'plan.json').read_text());STAGE=Path(P['stage'])
ENV={**os.environ,'PATH':str(STAGE/'bin')+os.pathsep+os.environ['PATH']}
def execute(command,path):
    with path.open('w')as stream:
        stream.write('COMMAND: '+repr(command)+'\n');stream.flush()
        result=subprocess.run(command,stdout=stream,stderr=subprocess.STDOUT,env=ENV)
        stream.write('\nEXIT: '+str(result.returncode)+'\n')
    return result.returncode
def sample(condition,case,cohort):
    root=R/cohort/condition/case;root.mkdir(parents=True)
    capture=execute([sys.executable,str(STAGE/condition/'scripts/run_behavior_evals.py'),'--case',case,'--mode','candidate',
        '--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['generationTimeout']),
        '--results-dir',str(root),'--host-feedback'],root/'capture.log')
    score=execute([sys.executable,str(STAGE/condition/'scripts/score_behavior_evals.py'),'--results-dir',str(root),'--mode','candidate',
        '--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['scoringTimeout']),'--batch-size','1'],root/'scoring.log')
    row={'condition':condition,'case':case,'cohort':cohort,'captureExit':capture,'scoreExit':score,'path':str(root.relative_to(R))}
    print(json.dumps(row),flush=True);return row
def pair(job,cohort):
    return [sample(condition,job['case'],cohort)for condition in job['conditions']]
def run(jobs,cohort):
    root=R/cohort;root.mkdir()
    (root/'selection.json').write_text(json.dumps({'jobs':jobs,'selectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
    rows=[];start=time.time()
    with ThreadPoolExecutor(max_workers=P['concurrency'])as pool:
        for future in as_completed([pool.submit(pair,job,cohort)for job in jobs]):rows.extend(future.result())
    (root/'outcomes.json').write_text(json.dumps({'elapsedSeconds':round(time.time()-start,1),'rows':rows},indent=2)+'\n')
if __name__=='__main__':
    jobs=[{'case':case,'conditions':['previous','candidate']if i%2==0 else['candidate','previous']}
          for i,case in enumerate(P['protocol']['targetedCases'])]
    jobs.sort(key=lambda row:row['case']not in {'accessible-dialog-primitive','vue-search-url-i18n'})
    run(jobs,'initial')
