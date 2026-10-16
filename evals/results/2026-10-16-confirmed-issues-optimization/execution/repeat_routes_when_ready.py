"""Historical repeat-failure sensitivity pairs, never replacing a first score."""
from pathlib import Path
import time
import run_pairs
R=Path(__file__).resolve().parents[1]
deadline=time.monotonic()+10800
while not (R/'initial/outcomes.json').exists():
    if time.monotonic()>deadline:raise TimeoutError('Initial cohort did not finish within watcher budget')
    time.sleep(20)
run_pairs.run([{'case':name,'conditions':['candidate','previous']if i==0 else['previous','candidate'],
               'reasons':['historical repeated route failure; selected independently of fresh scores']}
              for i,name in enumerate(run_pairs.P['protocol']['routeRepeat']['cases'])], 'route-repeat')
