"""Serial first-delivery audits after the two route workers have finished."""
from pathlib import Path
import json,subprocess,sys,time
R=Path(__file__).resolve().parents[1]
deadline=time.monotonic()+10800
def wait_for_cohort(cohort):
    while not (R/cohort/'outcomes.json').exists():
        if time.monotonic()>deadline:raise TimeoutError('Cohort did not finish before first-delivery audit budget: '+cohort)
        time.sleep(20)
wait_for_cohort('route-repeat')
jobs=[('initial','candidate'),('dialog-repeat','candidate'),('dialog-repeat','previous'),('capture-recovery','candidate')]
outcomes=[]
for cohort,condition in jobs:
    wait_for_cohort(cohort)
    command=[sys.executable,str(R/'execution/audit_delivery.py'),'--cohort',cohort,'--condition',condition]
    path=R/'execution'/f'first-delivery-{cohort}-{condition}.log'
    with path.open('x')as log:
        result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
    row={'cohort':cohort,'condition':condition,'exitCode':result.returncode,'log':str(path.relative_to(R))}
    print(json.dumps(row),flush=True);outcomes.append(row)
    if result.returncode:raise RuntimeError('First-delivery audit failed; preserve and inspect '+str(path))
(R/'delivery-status/outcomes.json').write_text(json.dumps(outcomes,indent=2)+'\n')
