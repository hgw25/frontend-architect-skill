"""Supplementary grades with pack results visible, preserving all original grades."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,time
R=Path(__file__).resolve().parents[1]
plan=json.loads((R/'plan.json').read_text())
stage=Path(plan['postCaptureScoringFix']['stage'])
environment={**os.environ,'PATH':str(stage/'bin')+os.pathsep+os.environ['PATH']}
jobs=[('previous-repeat',R/'dialog-repeat/previous/accessible-dialog-primitive'),
      ('final-guide',R/'final-forward/dialog/candidate/accessible-dialog-primitive')]
outcomes=[]
for label,source in jobs:
    deadline=time.monotonic()+10800
    while not (source/'scoring.log').exists()or'\nEXIT: 'not in (source/'scoring.log').read_text():
        if time.monotonic()>deadline:raise TimeoutError('Primary grading did not finish before supplement budget: '+label)
        time.sleep(20)
    target=R/'evidence-extractor-refinement'/label
    shutil.copytree(source,target,ignore=shutil.ignore_patterns('blind-scores'))
    command=[sys.executable,str(stage/'candidate/scripts/score_behavior_evals.py'),'--results-dir',str(target),
             '--mode','candidate','--model',plan['model'],'--reasoning-effort',plan['reasoning_effort'],
             '--timeout-seconds',str(plan['scoringTimeout']),'--batch-size','1']
    with (target/'complete-evidence-scoring.log').open('x')as log:
        result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,env=environment)
    row={'label':label,'source':str(source),'copy':str(target),'exitCode':result.returncode,
         'manifestUnchanged':hashlib.sha256((source/'manifest.json').read_bytes()).hexdigest()==hashlib.sha256((target/'manifest.json').read_bytes()).hexdigest(),
         'scope':'Supplementary scoring-only evidence completion. Original capture and grade retained; no guide-effect or generation-recovery claim.'}
    (target/'supplement.json').write_text(json.dumps(row,indent=2)+'\n')
    outcomes.append(row)
    print(json.dumps(row),flush=True)
(R/'evidence-extractor-refinement/outcomes.json').write_text(json.dumps(outcomes,indent=2)+'\n')
