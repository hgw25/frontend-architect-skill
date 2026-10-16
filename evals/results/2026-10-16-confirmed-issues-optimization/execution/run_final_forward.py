"""Forward checks of final guidance; only one Dialog runner at a time."""
from pathlib import Path
import os,subprocess,sys,time
import run_pairs
R=Path(__file__).resolve().parents[1]
run_pairs.STAGE=Path(run_pairs.P['finalStage'])
run_pairs.ENV={**os.environ,'PATH':str(run_pairs.STAGE/'bin')+os.pathsep+os.environ['PATH']}
names=run_pairs.P['refinement']['finalForwardCases']
run_pairs.run([{'case':name,'conditions':['candidate'],'reasons':['Final guide forward preservation check; no initial score replacement']}
               for name in names if name!='accessible-dialog-primitive'],'final-forward/main')
deadline=time.monotonic()+10800
while not (R/'capture-recovery/outcomes.json').exists():
    if time.monotonic()>deadline:raise TimeoutError('Original Dialog recovery did not finish before final forward budget')
    time.sleep(20)
run_pairs.P['concurrency']=1
run_pairs.run([{'case':'accessible-dialog-primitive','conditions':['candidate'],
               'reasons':['One final-guide Dialog forward check after original repeat and recovery; no simultaneous Dialog run']}], 'final-forward/dialog')
command=[sys.executable,str(R/'execution/audit_delivery.py'),'--cohort','final-forward/dialog','--condition','candidate']
with (R/'execution/first-delivery-final-forward.log').open('x')as log:
    result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:raise RuntimeError('Final Dialog first-delivery audit failed; inspect preserved log')
