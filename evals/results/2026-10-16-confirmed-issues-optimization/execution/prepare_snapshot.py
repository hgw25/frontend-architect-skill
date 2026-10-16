"""Capture the complete Git-distributable dirty tree after evaluation is closed."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
plan_path = RESULTS / 'run-plan.json'
plan = json.loads(plan_path.read_text())
if plan['status'] != 'validated':
    raise SystemExit('Complete validation review before packaging')
target = Path(plan['stage']) / 'installation-source'
manifest_path = RESULTS / 'installation-source-manifest.json'
if target.exists() or manifest_path.exists():
    raise SystemExit('Snapshot already exists; inspect it instead of overwriting')
guide_files = [SOURCE / 'SKILL.md', SOURCE / 'CONTRIBUTING.md', *(SOURCE / 'references').glob('*.md')]
guide_hashes = {str(p.relative_to(SOURCE)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(guide_files)}
identity = '0.4.2+local.20261016.' + hashlib.sha256(json.dumps(guide_hashes, sort_keys=True).encode()).hexdigest()[:12]
plan.update(installationSource=str(target), installationSourceManifest=str(manifest_path), localSnapshotId=identity)
plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
def inventory():
    raw = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=SOURCE)
    return sorted({p.decode() for p in raw.split(b'\0') if p and (SOURCE / p.decode()).is_file()})
names = inventory()
files = {}
target.mkdir()
for relative in names:
    source = SOURCE / relative
    if source.is_symlink():
        raise RuntimeError('Unexpected distribution symlink: ' + relative)
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    files[relative] = hashlib.sha256(destination.read_bytes()).hexdigest()
if names != inventory() or any(hashlib.sha256((SOURCE / p).read_bytes()).hexdigest() != h for p, h in files.items()):
    raise RuntimeError('Working tree changed while packaging; retain snapshot for inspection')
manifest_path.write_text(json.dumps({'snapshotId': identity, 'sourceRoot': str(SOURCE), 'sourceHead': plan['sourceHead'],
    'distribution': 'All existing tracked and non-ignored untracked files; no minimal package filtering',
    'pointInTime': 'Before activation; later receipts and final report updates remain in the source verification record',
    'files': files}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'source': str(target), 'manifest': str(manifest_path), 'snapshotId': identity, 'files': len(files)}, ensure_ascii=False))
