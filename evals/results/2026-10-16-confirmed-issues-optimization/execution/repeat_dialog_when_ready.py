"""Run the pre-registered repeat after the initial Dialog pair releases its ports."""
from pathlib import Path
import json,time
import run_pairs
R=Path(__file__).resolve().parents[1]
deadline=time.monotonic()+10800
for condition in ('previous','candidate'):
    folder=R/'initial'/condition/'accessible-dialog-primitive'
    while not (folder/'scoring.log').exists()or '\nEXIT: 'not in (folder/'scoring.log').read_text():
        if time.monotonic()>deadline:
            raise TimeoutError('Initial Dialog pair did not complete within the watcher budget')
        time.sleep(20)
run_pairs.P['concurrency']=1
run_pairs.run([{'case':'accessible-dialog-primitive','conditions':['candidate','previous'],
                'reasons':['pre-registered Dialog variance repeat; initial pair finished before repeat']}], 'dialog-repeat')
