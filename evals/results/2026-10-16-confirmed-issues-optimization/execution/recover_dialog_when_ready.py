"""One separate recovery of the isolated-invalid initial candidate Dialog."""
from pathlib import Path
import time
import run_pairs
R=Path(__file__).resolve().parents[1]
deadline=time.monotonic()+10800
for cohort in ('initial','dialog-repeat'):
    while not (R/cohort/'outcomes.json').exists():
        if time.monotonic()>deadline:raise TimeoutError('Dialog repeat/initial cohort did not finish before recovery budget')
        time.sleep(20)
run_pairs.P['concurrency']=1
run_pairs.run([{'case':'accessible-dialog-primitive','conditions':['candidate'],
               'reasons':['One recovery of initial invalid: unauthorized global ponytail read. Initial invalid stays unchanged.']}], 'capture-recovery')
