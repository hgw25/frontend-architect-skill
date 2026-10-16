"""Bounded, separately archived follow-ups selected by the pre-registered rules."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import argparse,datetime,json,os,subprocess,sys,time
R=Path(__file__).resolve().parents[1];P=json.loads((R/'run-plan.json').read_text());STAGE=Path(P.get('followupStage',P['stage']))
ENV={**os.environ,'PATH':str(STAGE/'bin')+os.pathsep+os.environ['PATH']}
parser=argparse.ArgumentParser();parser.add_argument('--kind',choices=['capture-recovery','repeats'],required=True);parser.add_argument('--workers',type=int,choices=[1,2,3],default=3);args=parser.parse_args()
summary=json.loads((R/'summary.json').read_text());T=R/args.kind
if T.exists():raise SystemExit('Follow-up root already exists; refusing to replace attempts')
T.mkdir()
if args.kind=='capture-recovery':
 jobs=[{'case':cid,'conditions':[condition],'reason':rec['captureErrors']}for condition,rows in summary['captures'].items() for cid,rec in rows.items() if rec['captureErrors']]
else:
 jobs=[{'case':row['id'],'conditions':['previous','candidate'],'reason':row['reasons']}for row in summary['repeatCandidates']]
 jobs.sort(key=lambda job:job['case']!='accessible-dialog-primitive')
(T/'selection.json').write_text(json.dumps({'selectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ruleSource':'../run-plan.json','workers':args.workers,'jobs':jobs,'claim':'Each attempt is retained separately and never replaces the first capture/score.'},ensure_ascii=False,indent=2)+'\n')
def execute(cmd,path):
 with path.open('w') as stream:
  stream.write('COMMAND: '+repr(cmd)+'\n');stream.flush();done=subprocess.run(cmd,stdout=stream,stderr=subprocess.STDOUT,env=ENV);stream.write('\nEXIT: '+str(done.returncode)+'\n')
 return done.returncode
def worker(job):
 rows=[]
 for c in job['conditions']:
  folder=T/c/job['case'];folder.mkdir(parents=True)
  cmd=[sys.executable,str(STAGE/c/'scripts/run_behavior_evals.py'),'--case',job['case'],'--mode','candidate','--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['generation_timeout_seconds']),'--results-dir',str(folder)]
  capture=execute(cmd,folder/'capture.log')
  cmd=[sys.executable,str(STAGE/c/'scripts/score_behavior_evals.py'),'--results-dir',str(folder),'--mode','candidate','--batch-size','1','--model',P['model'],'--reasoning-effort',P['reasoning_effort'],'--timeout-seconds',str(P['scoring_timeout_seconds'])]
  scoring=execute(cmd,folder/'scoring.log')
  row={'case':job['case'],'condition':c,'captureExit':capture,'scoringExit':scoring,'folder':str(folder.relative_to(R))};rows.append(row);print(json.dumps(row),flush=True)
 return rows
start=time.time();outcomes=[]
with ThreadPoolExecutor(max_workers=args.workers)as pool:
 for f in as_completed([pool.submit(worker,job)for job in jobs]):
  try:outcomes.extend(f.result())
  except Exception as e:outcomes.append({'error':repr(e)})
(T/'outcomes.json').write_text(json.dumps({'elapsedSeconds':round(time.time()-start,1),'outcomes':outcomes},indent=2)+'\n')
