"""Activate this reviewed, unreleased source snapshot using the common executor."""
from pathlib import Path
import sys,json,hashlib,subprocess,tempfile,shutil
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(root/'skills/frontend-architect-update/scripts'))
import manage_installation as manager
backup_root=Path('/Users/heguangwei/.codex/skill-backups')
main=Path('/Users/heguangwei/.codex/skills/frontend-architect')
companion=main.parent/'frontend-architect-update'
prior=json.loads((root/'evals/results/2026-10-19-autonomous-workflows/judgment-refinement/installation-receipt.json').read_text())
if not all(hashlib.sha256((main/name).read_bytes()).hexdigest()==digest for name,digest in prior['files'].items()):
 raise RuntimeError('Known installed runtime changed; inspect before replacing')
old_companion=subprocess.run(['git','show','HEAD:skills/frontend-architect-update/SKILL.md'],cwd=root,capture_output=True,check=True).stdout
if sorted(p.name for p in companion.iterdir())!=['SKILL.md'] or (companion/'SKILL.md').read_bytes()!=old_companion:
 raise RuntimeError('Known independent companion changed; inspect before replacing')
final_plan=json.loads((root/'evals/results/2026-10-19-evaluation-acceptance/final-plan.json').read_text())
if not all(hashlib.sha256((root/name).read_bytes()).hexdigest()==digest for name,digest in final_plan['guidance_sha256'].items()):
 raise RuntimeError('Guidance changed since final forward tests')
files=subprocess.run(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root,capture_output=True,check=True).stdout.decode().split('\0')
source_manifest={}
with tempfile.TemporaryDirectory(prefix='frontend-architect-reviewed-preview-') as temporary:
 staged=Path(temporary)/'frontend-architect';staged.mkdir()
 for name in sorted(set(filter(None,files))):
  source=root/name
  if source.is_symlink():raise RuntimeError('Explicit symlink contract needed: '+name)
  if not source.is_file():continue
  target=staged/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  source_manifest[name]=hashlib.sha256(target.read_bytes()).hexdigest()
 snapshot=hashlib.sha256(json.dumps(source_manifest,sort_keys=True).encode()).hexdigest()
 version=(root/'VERSION').read_text().strip()+'+local.20261019.'+snapshot[:12]
 (staged/'VERSION').write_text(version+'\n')
 staged_companion=Path(temporary)/'frontend-architect-update'
 shutil.copytree(staged/'skills/frontend-architect-update',staged_companion)
 (staged_companion/'VERSION').write_text(version+'\n')
 for candidate in (staged,staged_companion):
  result=subprocess.run(['/tmp/frontend-architect-design-workflow-venv/bin/python','/Users/heguangwei/.codex/skills/.system/skill-creator/scripts/quick_validate.py',str(candidate)],capture_output=True,text=True,check=True)
  print(result.stdout.strip(),flush=True)
 before={str(destination):manager.inspect_installation(destination) for destination in (main,companion)}
 # Known previous previews were identified above; all outgoing support files are preserved.
 main_receipt=manager.activate(staged,main,backup_root,expected_current=before[str(main)]['files'],tag='local-preview')
 companion_receipt=manager.activate(staged_companion,companion,backup_root,expected_current=before[str(companion)]['files'],tag='local-preview',skill_name='frontend-architect-update')
 manager.verify_installation(main,main_receipt['installed_files'])
 manager.verify_installation(companion,companion_receipt['installed_files'])
 runtime_match=all(hashlib.sha256((main/name).read_bytes()).hexdigest()==digest for name,digest in final_plan['guidance_sha256'].items())
 assert runtime_match and not(main/manager.EMBEDDED).exists()
 summary={'kind':'reviewed local development preview, not a published release','state':'completed','version':version,'source':str(root),'base_commit':subprocess.run(['git','rev-parse','HEAD'],cwd=root,capture_output=True,text=True,check=True).stdout.strip(),'source_files':source_manifest,'source_snapshot_sha256':snapshot,'runtime_matches_final_frozen_guidance':runtime_match,'known_previous_runtime_verified':True,'known_previous_companion_verified':True,'untracked_or_support_outgoing_files_preserved':True,'main_receipt':main_receipt['receipt'],'companion_receipt':companion_receipt['receipt'],'main_backup':main_receipt['backup'],'companion_backup':companion_receipt['backup'],'nested_companion_discovery_removed':True,'completed_at':datetime.now(timezone.utc).isoformat()}
 (backup_root/'frontend-architect-preview-20261019.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in summary.items() if k!='source_files'},ensure_ascii=False,indent=2),flush=True)
