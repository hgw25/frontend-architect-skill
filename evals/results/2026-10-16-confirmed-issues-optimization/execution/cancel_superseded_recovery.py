"""Release final-guide verification after the fixed repeat; no old-guide capture."""
from pathlib import Path
import datetime,json,time
R=Path(__file__).resolve().parents[1]
deadline=time.monotonic()+10800
while not (R/'dialog-repeat/outcomes.json').exists():
    if time.monotonic()>deadline:raise TimeoutError('Fixed repeat did not finish before cancellation release budget')
    time.sleep(20)
root=R/'capture-recovery'
root.mkdir()
row={'status':'cancelled-before-start','rows':[],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
     'reason':json.loads((R/'plan.json').read_text())['supersededRecovery']['reason']}
(root/'outcomes.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(row,ensure_ascii=False))
