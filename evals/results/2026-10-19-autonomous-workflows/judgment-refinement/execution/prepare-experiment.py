"""Freeze comparable guidance and raw fixtures; generators never see grading/oracles."""
from pathlib import Path
import hashlib,json,shutil,tempfile
import yaml
root=Path(__file__).resolve().parents[5]
out=Path(__file__).resolve().parent.parent
assert (root/'SKILL.md').exists(),root
files=json.loads((out/'before-guidance/hashes.json').read_text())
after=out/'after-guidance';after.mkdir(exist_ok=True)
for name in files:
 target=after/('SKILL.snapshot.md' if name=='SKILL.md' else name)
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
(after/'hashes.json').write_text(json.dumps({n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in files},indent=2)+'\n')
selected=['autonomous-live-board','autonomous-live-runtime','autonomous-live-flags']
plan={'model':'gpt-5.6-sol','reasoning_effort':'medium','sandbox':'danger-full-access','permission_basis':'Same as current task; both conditions identical. Only copied driver permission differs from repository default.','conditions':{},'case_ids':selected,'input_policy':'Raw request and raw project plus isolated skill only; no diagnostics, expected solution, parent chat, grading criteria or oracle; no host-feedback prompt.'}
for condition,guidance in [('before','before-guidance'),('after','after-guidance')]:
 source=Path(tempfile.mkdtemp(prefix='frontend-architect-judgment-'+condition+'-'))
 shutil.copytree(root/'scripts',source/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
 (source/'evals').mkdir();shutil.copy2(root/'evals/cases.yaml',source/'evals/cases.yaml');shutil.copy2(root/'evals/rubric.md',source/'evals/rubric.md')
 for case in yaml.safe_load((root/'evals/cases.yaml').read_text())['cases']:
  if case['id'] in selected:
   shutil.copytree(root/case['fixture'],source/case['fixture'])
 for name in files:
  src=out/guidance/('SKILL.snapshot.md' if name=='SKILL.md' else name)
  target=source/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target)
 driver=source/'scripts/run_behavior_evals.py';text=driver.read_text();assert text.count('"workspace-write"')==1
 driver.write_text(text.replace('"workspace-write"','"danger-full-access"'))
 plan['conditions'][condition]={'source':str(source),'guidance':guidance}
plan['status']='prepared'
(out/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
shutil.copy2(root/'evals/cases.yaml',out/'frozen-cases.yaml')
for case in yaml.safe_load((root/'evals/cases.yaml').read_text())['cases']:
 if case['id'] in selected:shutil.copytree(root/case['fixture'],out/'frozen-fixtures'/Path(case['fixture']).name)
print(json.dumps(plan,ensure_ascii=False,indent=2))
