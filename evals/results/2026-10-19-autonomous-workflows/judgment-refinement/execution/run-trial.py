from pathlib import Path
import json,subprocess,sys
out=Path(__file__).resolve().parent.parent
plan=json.loads((out/'plan.json').read_text());condition,case=sys.argv[1:3]
label=sys.argv[3] if len(sys.argv)>3 else condition
model=sys.argv[4] if len(sys.argv)>4 else plan['model']
source=Path(plan['conditions'][condition]['source'])
command=['/tmp/frontend-architect-design-workflow-venv/bin/python',str(source/'scripts/run_behavior_evals.py'),'--case',case,'--mode','candidate','--model',model,'--reasoning-effort',plan['reasoning_effort'],'--timeout-seconds','900','--results-dir',str(out/label/case)]
result=subprocess.run(command,cwd=source,text=True,capture_output=True)
(out/'execution'/f'{label}-{case}.log').write_text(result.stdout+result.stderr)
print(condition,case,result.returncode,result.stdout[-1200:],result.stderr[-1200:])
raise SystemExit(result.returncode)
