"""Activate only this task's reviewed local changes, with a complete recovery copy."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import subprocess
import sys
import uuid

root = Path(sys.argv[1]).resolve()
python = Path(sys.argv[2]).absolute()
destination = Path.home() / '.codex/skills/frontend-architect'
result = root / 'evals/results/2026-10-19-design-workflow'
changed = ['SKILL.md', 'references/architecture-and-code.md', 'README.md', 'CHANGELOG.md',
           'evals/cases.yaml', 'evals/cases.md']
score = json.loads((result / 'candidate-v2-5.6/blind-scores/scores.json').read_text())
assert {r['id'] for r in score['conditions']['candidate'] if r.get('verdict') == 'target'} == {
    'requirement-only-conditional-fields', 'requirement-only-export-refactor'}
assert all(c['parsable'] for c in json.loads((result / 'candidate-v2-5.6/diagram-checks.json').read_text())['checks'])
assert not destination.is_symlink() and not (destination / '.git').exists()
backup_root = Path.home() / '.codex/skill-backups'
backup_root.mkdir(parents=True, exist_ok=True)
lock = backup_root / 'frontend-architect-local-preview.lock'
lock.mkdir()
try:
    original = {name: (destination / name).read_bytes() for name in changed}
    for name, content in original.items():
        assert content == subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=root), name
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    recovery = backup_root / 'frontend-architect' / stamp
    recovery.mkdir(parents=True)
    stage = recovery / 'staged'
    shutil.copytree(destination, stage)
    for name in changed:
        shutil.copy2(root / name, stage / name)
    shutil.copytree(root / 'evals/fixtures/conditional-fields', stage / 'evals/fixtures/conditional-fields')
    shutil.copytree(result, stage / result.relative_to(root))
    checked = subprocess.run([str(python), str(stage / 'scripts/validate_skill.py')], capture_output=True, text=True)
    (result / 'execution/staged-validation.log').write_text(checked.stdout + checked.stderr)
    checked.check_returncode()
    for name, content in original.items():
        assert (destination / name).read_bytes() == content, 'Concurrent change: ' + name
    previous = recovery / 'previous'
    destination.rename(previous)
    try:
        stage.rename(destination)
        for name in changed:
            assert (destination / name).read_bytes() == (root / name).read_bytes(), name
        checked = subprocess.run([str(python), str(destination / 'scripts/validate_skill.py')], capture_output=True, text=True)
        (result / 'execution/installed-validation.log').write_text(checked.stdout + checked.stderr)
        checked.check_returncode()
    except BaseException:
        if destination.exists():
            destination.rename(recovery / 'failed-candidate')
        previous.rename(destination)
        raise
    version = (root / 'VERSION').read_text().strip()
    hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in changed}
    receipt = {'status': 'complete', 'operation': 'local-development-preview',
               'repository': 'https://github.com/hgw25/frontend-architect-skill',
               'source': str(root), 'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
               'declaredVersion': version, 'snapshotId': version + '+local.20261019.' + hashes['SKILL.md'][:12],
               'tag': None, 'publishedVersionUnchanged': True, 'destination': str(destination),
               'backup': str(previous), 'files': hashes, 'completedAt': datetime.now(timezone.utc).isoformat()}
    data = json.dumps(receipt, ensure_ascii=False, indent=2) + '\n'
    (recovery / 'receipt.json').write_text(data)
    (result / 'installation-receipt.json').write_text(data)
    installed_result = destination / result.relative_to(root)
    (installed_result / 'installation-receipt.json').write_text(data)
    for name in ('staged-validation.log', 'installed-validation.log'):
        shutil.copy2(result / 'execution' / name, installed_result / 'execution' / name)
    print(json.dumps({k: receipt[k] for k in ('status', 'snapshotId', 'backup')}, ensure_ascii=False))
finally:
    lock.rmdir()
