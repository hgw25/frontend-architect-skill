from pathlib import Path
import json,subprocess,sys
out=Path(__file__).resolve().parent.parent;plan=json.loads((out/'plan.json').read_text())
condition,case=sys.argv[1:3];source=Path(plan['conditions'][condition]['source'])
label=sys.argv[3] if len(sys.argv)>3 else condition
model=sys.argv[4] if len(sys.argv)>4 else plan['model']
command=['/tmp/frontend-architect-design-workflow-venv/bin/python',str(source/'scripts/score_behavior_evals.py'),'--case',case,'--mode','candidate','--model',model,'--reasoning-effort',plan['reasoning_effort'],'--timeout-seconds','600','--results-dir',str(out/label/case)]
r=subprocess.run(command,cwd=source,text=True,capture_output=True)
(out/'execution'/f'score-{label}-{case}.log').write_text(r.stdout+r.stderr)
print(condition,case,r.returncode,r.stdout[-1400:],r.stderr[-1400:]);raise SystemExit(r.returncode)
