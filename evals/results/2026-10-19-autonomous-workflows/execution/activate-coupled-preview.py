"""Overlay the coupled-development refinement onto the prior local preview."""
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
result = root / 'evals/results/2026-10-19-autonomous-workflows'
baseline = json.loads((result / 'frozen-inputs/before-coupled-refinement/hashes.json').read_text())
prior = json.loads((result / 'installation-receipt.json').read_text())
destination = Path(prior['destination'])
assert not destination.is_symlink() and not (destination / '.git').exists()
for group in ['candidate-v5-coupled-development', 'candidate-v5-coupled-design']:
    score = json.loads((result / group / 'blind-scores/scores.json').read_text())
    assert len(score['conditions']['candidate']) == 1
    assert score['conditions']['candidate'][0]['verdict'] == 'target', group
    assert all(c['passed'] for c in json.loads((result / group / 'artifact-checks.json').read_text())), group
    diagrams = json.loads((result / group / 'diagram-checks.json').read_text())
    assert not any(c['parsable'] is False for c in diagrams['checks']), group
for name, frozen in [('SKILL.md', 'SKILL.snapshot.md'),
                     ('references/architecture-and-code.md', 'references/architecture-and-code.md'),
                     ('agents/openai.yaml', 'openai.yaml')]:
    assert (root / name).read_bytes() == (result / 'frozen-inputs/candidate-v5-coupled' / frozen).read_bytes(), name

backup_root = Path.home() / '.codex/skill-backups'
lock = backup_root / 'frontend-architect-local-preview.lock'
lock.mkdir()
try:
    original = {name: (destination / name).read_bytes() for name in baseline}
    for name, data in original.items():
        assert hashlib.sha256(data).hexdigest() == baseline[name], 'Installation changed: ' + name
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    recovery = backup_root / 'frontend-architect' / stamp
    recovery.mkdir(parents=True)
    stage = recovery / 'staged'
    shutil.copytree(destination, stage)
    for name in baseline:
        shutil.copy2(root / name, stage / name)
    shutil.copytree(result, stage / result.relative_to(root), dirs_exist_ok=True)

    def validate(path, log):
        checked = subprocess.run([str(python), str(path / 'scripts/validate_skill.py')],
                                 capture_output=True, text=True)
        (result / 'execution' / log).write_text(checked.stdout + checked.stderr)
        checked.check_returncode()

    validate(stage, 'coupled-staged-validation.log')
    for name, data in original.items():
        assert (destination / name).read_bytes() == data, 'Concurrent change: ' + name
    previous = recovery / 'previous'
    destination.rename(previous)
    try:
        stage.rename(destination)
        for name in baseline:
            assert (destination / name).read_bytes() == (root / name).read_bytes(), name
        validate(destination, 'coupled-installed-validation.log')
    except BaseException:
        if destination.exists():
            destination.rename(recovery / 'failed-candidate')
        previous.rename(destination)
        raise
    hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in baseline}
    receipt = {
        **{key: prior[key] for key in ['operation', 'repository', 'source', 'sourceCommit',
                                     'declaredVersion', 'tag', 'publishedVersionUnchanged', 'destination']},
        'status': 'complete',
        'snapshotId': prior['declaredVersion'] + '+local.20261019.' + hashes['SKILL.md'][:12],
        'supersedesSnapshotId': prior['snapshotId'], 'backup': str(previous), 'files': hashes,
        'completedAt': datetime.now(timezone.utc).isoformat(),
    }
    data = json.dumps(receipt, ensure_ascii=False, indent=2) + '\n'
    (recovery / 'receipt.json').write_text(data)
    (result / 'coupled-refinement-installation-receipt.json').write_text(data)
    installed_result = destination / result.relative_to(root)
    (installed_result / 'coupled-refinement-installation-receipt.json').write_text(data)
    for name in ['coupled-staged-validation.log', 'coupled-installed-validation.log']:
        shutil.copy2(result / 'execution' / name, installed_result / 'execution' / name)
    print(json.dumps({key: receipt[key] for key in ['status', 'snapshotId', 'backup']}, ensure_ascii=False))
finally:
    lock.rmdir()
