"""Freeze a scoring-only pack-command evidence fix; generation inputs stay frozen."""
from pathlib import Path
import hashlib,json,shutil,tempfile
R=Path(__file__).resolve().parents[1]
S=R.parents[2]
plan=json.loads((R/'plan.json').read_text())
stage=Path(tempfile.mkdtemp(prefix='frontend-complete-pack-evidence-'))
base=Path(plan['finalStage'])
shutil.copytree(base/'bin',stage/'bin')
shutil.copytree(base/'candidate',stage/'candidate',ignore=shutil.ignore_patterns('__pycache__'))
archive=R/'evidence-extractor-refinement/frozen-source'
archive.mkdir(parents=True)
changes={}
for name in ('scripts/score_behavior_evals.py','scripts/test_score_behavior_evals.py'):
    before=hashlib.sha256((base/'candidate'/name).read_bytes()).hexdigest()
    shutil.copy2(S/name,stage/'candidate'/name)
    target=archive/name
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(S/name,target)
    changes[name]={'before':before,'after':hashlib.sha256(target.read_bytes()).hexdigest()}
note={'stage':str(stage),'sourceChanges':changes,'reason':'Pack success with an explicit cache path or npm_config_cache assignment was omitted from grader evidence. Preserve old grades; use separate copies for supplementary grading, without regenerating or changing task/fixture/readiness rules.'}
(R/'evidence-extractor-refinement/source-hashes.json').write_text(json.dumps(note,indent=2)+'\n')
plan['postCaptureScoringFix']=note
(R/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(note))
