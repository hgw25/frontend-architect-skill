"""Freeze the single readiness-wording refinement, retaining the initial comparison."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,shutil,tempfile
R=Path(__file__).resolve().parents[1]
S=R.parents[2]
plan=json.loads((R/'plan.json').read_text())
initial=Path(plan['stage'])
stage=Path(tempfile.mkdtemp(prefix='frontend-confirmed-final-'))
shutil.copytree(initial/'bin',stage/'bin')
shutil.copytree(initial/'candidate',stage/'candidate',ignore=shutil.ignore_patterns('__pycache__'))
shutil.copy2(S/'SKILL.md',stage/'candidate/SKILL.md')
frozen=R/'final-forward/frozen-inputs/candidate'
shutil.copytree(stage/'candidate',frozen)
for name in ('SKILL','CONTRIBUTING'):(frozen/(name+'.md')).rename(frozen/(name+'.snapshot.md'))
hashes={str(p.relative_to(frozen)):hashlib.sha256(p.read_bytes()).hexdigest()for p in frozen.rglob('*')if p.is_file()}
(frozen.parent.parent/'input-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
changed=[]
for path in (stage/'candidate').rglob('*'):
    if path.is_file()and'__pycache__'not in path.parts:
        relative=path.relative_to(stage/'candidate')
        if path.read_bytes()!=(initial/'candidate'/relative).read_bytes():changed.append(str(relative))
assert changed==['SKILL.md'],changed
plan.update(finalStage=str(stage),finalGuideSnapshot=str(frozen.resolve()))
plan['refinement'].update(frozenAt=datetime.now(timezone.utc).isoformat(),changedInputs=changed)
(R/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'finalStage':str(stage),'files':len(hashes),'changedInputs':changed}))
