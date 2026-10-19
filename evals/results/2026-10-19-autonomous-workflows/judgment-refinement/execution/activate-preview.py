"""Activate the verified local preview with provenance, a full backup and byte guards."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,shutil,subprocess,uuid
root=Path(__file__).resolve().parents[5];out=Path(__file__).resolve().parent.parent
python='/tmp/frontend-architect-design-workflow-venv/bin/python'
acceptance=json.loads((out/'acceptance.json').read_text())
assert acceptance['ready_for_local_preview'] is True
prior=json.loads((out.parent/'lenses-refinement-installation-receipt.json').read_text())
destination=Path(prior['destination']);assert not destination.is_symlink() and not (destination/'.git').exists()
expected=json.loads((out/'before-guidance/hashes.json').read_text())
after=json.loads((out/'verification-guidance/hashes.json').read_text())
for name,wanted in expected.items():assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==wanted,'Installed guidance changed: '+name
for name,wanted in prior['files'].items():assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==wanted,'Installed provenance changed: '+name
for name,wanted in after.items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==wanted,'Evaluated source changed: '+name

def inventory(folder):
 return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file() and not set(p.parts).intersection({'__pycache__','node_modules'}) and p.name!='.DS_Store'}
def validate(folder,label):
 commands=[[python,str(folder/'scripts/validate_skill.py')],[python,'/Users/heguangwei/.codex/skills/.system/skill-creator/scripts/quick_validate.py',str(folder)]]
 for index,command in enumerate(commands):
  result=subprocess.run(command,cwd=folder,text=True,capture_output=True)
  (out/'execution'/f'{label}-{index}.log').write_text(result.stdout+result.stderr);result.check_returncode()
backup_root=Path.home()/'.codex/skill-backups';lock=backup_root/'frontend-architect-local-preview.lock';lock.mkdir()
try:
 original=inventory(destination)
 stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]
 recovery=backup_root/'frontend-architect'/stamp;recovery.mkdir(parents=True)
 stage=recovery/'staged';shutil.copytree(destination,stage,ignore=shutil.ignore_patterns('__pycache__','*.pyc','.DS_Store'))
 # Reuse the full existing distribution; refresh maintained source and eval records.
 # The independent update companion remains outside this installation.
 for name in ['SKILL.md','CONTRIBUTING.md','README.md','CHANGELOG.md','VERSION','requirements-dev.txt','agents','references','scripts','evals']:
  src=root/name;dest=stage/name
  if src.is_dir():shutil.copytree(src,dest,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc','.DS_Store','node_modules'))
  else:shutil.copy2(src,dest)
 validate(stage,'staged-validation')
 assert inventory(destination)==original,'Concurrent installation change'
 previous=recovery/'previous';destination.rename(previous)
 try:
  stage.rename(destination)
  for name,wanted in after.items():assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==wanted,name
  validate(destination,'installed-validation')
 except BaseException:
  if destination.exists():destination.rename(recovery/'failed-candidate')
  previous.rename(destination);raise
 receipt={**{key:prior[key] for key in ['operation','repository','source','sourceCommit','declaredVersion','tag','publishedVersionUnchanged','destination']},'status':'complete','snapshotId':prior['declaredVersion']+'+local.20261019.'+after['SKILL.md'][:12],'supersedesSnapshotId':prior['snapshotId'],'backup':str(previous),'files':after,'completedAt':datetime.now(timezone.utc).isoformat(),'acceptance':'evals/results/2026-10-19-autonomous-workflows/judgment-refinement/acceptance.json','distribution':'Existing full distribution refreshed with current source, fixtures and evidence; independent companion unchanged.'}
 data=json.dumps(receipt,ensure_ascii=False,indent=2)+'\n'
 (recovery/'receipt.json').write_text(data);(out/'installation-receipt.json').write_text(data)
 installed_result=destination/out.relative_to(root);(installed_result/'installation-receipt.json').write_text(data)
 for file in (out/'execution').glob('*validation-*.log'):shutil.copy2(file,installed_result/'execution'/file.name)
 print(json.dumps({key:receipt[key] for key in ['status','snapshotId','backup']},ensure_ascii=False))
finally:lock.rmdir()
