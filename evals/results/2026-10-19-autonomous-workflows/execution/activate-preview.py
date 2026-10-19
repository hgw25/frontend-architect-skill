"""Activate the verified local preview while preserving the prior unpublished work."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import subprocess
import sys
import uuid

root = Path(sys.argv[1]).resolve()
python = Path(sys.argv[2]).absolute()  # Keep the venv interpreter path intact.
destination = Path.home() / '.codex/skills/frontend-architect'
result = root / 'evals/results/2026-10-19-autonomous-workflows'
changed = ['SKILL.md', 'references/architecture-and-code.md',
           'references/verification-and-review.md', 'agents/openai.yaml',
           'README.md', 'CHANGELOG.md', 'evals/cases.yaml', 'evals/cases.md']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


expected = json.loads((result / 'before-change-hashes.json').read_text())
expected['references/architecture-and-code.md'] = sha(
    result / 'frozen-inputs/previous/references/architecture-and-code.md')
outcomes = json.loads((result / 'outcomes.json').read_text())
for group in outcomes['final_path_groups'] + [outcomes['local_edit_control_group']]:
    rows = [row for row in outcomes['cases'] if row['group'] == group]
    assert len(rows) == 1 and rows[0]['combined_verdict'] == 'target', group
    assert rows[0]['generation_exit_code'] == 0, group
    assert all(check['exit_code'] == 0 for check in rows[0]['validations']), group
    if rows[0]['id'] in {'autonomous-feature-development', 'autonomous-architecture-design'}:
        assert rows[0]['artifact_check'] is True, group
        diagrams = json.loads((result / group / 'diagram-checks.json').read_text())
        assert not any(check['parsable'] is False for check in diagrams['checks']), group
for name in ['SKILL.md', 'references/architecture-and-code.md',
             'references/verification-and-review.md', 'agents/openai.yaml']:
    frozen = ('SKILL.snapshot.md' if name == 'SKILL.md' else
              'openai.yaml' if name == 'agents/openai.yaml' else name)
    assert (root / name).read_bytes() == (result / 'frozen-inputs/candidate-v4' / frozen).read_bytes(), name
assert not destination.is_symlink() and not (destination / '.git').exists()
fixture = Path('evals/fixtures/autonomous-export-review')
assert not (destination / fixture).exists()
assert not (destination / result.relative_to(root)).exists()
backup_root = Path.home() / '.codex/skill-backups'
backup_root.mkdir(parents=True, exist_ok=True)
lock = backup_root / 'frontend-architect-local-preview.lock'
lock.mkdir()
try:
    original = {name: (destination / name).read_bytes() for name in changed}
    for name in changed:
        assert sha(destination / name) == expected[name], 'Pre-task installation changed: ' + name
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    recovery = backup_root / 'frontend-architect' / stamp
    recovery.mkdir(parents=True)
    stage = recovery / 'staged'
    shutil.copytree(destination, stage)
    for name in changed:
        shutil.copy2(root / name, stage / name)
    shutil.copytree(root / fixture, stage / fixture)
    shutil.copytree(result, stage / result.relative_to(root))
    checked = subprocess.run([str(python), str(stage / 'scripts/validate_skill.py')],
                             capture_output=True, text=True)
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
        checked = subprocess.run([str(python), str(destination / 'scripts/validate_skill.py')],
                                 capture_output=True, text=True)
        (result / 'execution/installed-validation.log').write_text(checked.stdout + checked.stderr)
        checked.check_returncode()
    except BaseException:
        if destination.exists():
            destination.rename(recovery / 'failed-candidate')
        previous.rename(destination)
        raise
    version = (root / 'VERSION').read_text().strip()
    receipt = {
        'status': 'complete', 'operation': 'local-development-preview',
        'repository': 'https://github.com/hgw25/frontend-architect-skill',
        'source': str(root),
        'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
        'declaredVersion': version,
        'snapshotId': version + '+local.20261019.' + sha(root / 'SKILL.md')[:12],
        'supersedesSnapshotId': '0.5.0+local.20261019.e405fa9f9379',
        'tag': None, 'publishedVersionUnchanged': True,
        'destination': str(destination), 'backup': str(previous),
        'files': {name: sha(root / name) for name in changed},
        'completedAt': datetime.now(timezone.utc).isoformat(),
    }
    data = json.dumps(receipt, ensure_ascii=False, indent=2) + '\n'
    (recovery / 'receipt.json').write_text(data)
    (result / 'installation-receipt.json').write_text(data)
    installed_result = destination / result.relative_to(root)
    (installed_result / 'installation-receipt.json').write_text(data)
    for name in ['staged-validation.log', 'installed-validation.log']:
        shutil.copy2(result / 'execution' / name, installed_result / 'execution' / name)
    print(json.dumps({key: receipt[key] for key in ['status', 'snapshotId', 'destination', 'backup']},
                     ensure_ascii=False))
finally:
    lock.rmdir()
