"""Recorded local snapshot activation; not a new general-purpose updater."""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from uuid import uuid4

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
NESTED_COMPANION = 'skills/frontend-architect-update/'


def fingerprint(root, normalized=False):
    result = {}
    for path in root.rglob('*'):
        if not path.is_file() or '__pycache__' in path.parts or path.suffix == '.pyc' or path.name == '.DS_Store':
            continue
        relative = str(path.relative_to(root))
        if normalized and relative.startswith(NESTED_COMPANION):
            continue
        result[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def activate(source, destination, operation, staging, lock, expected, copy, check):
    lock.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    backup = operation / 'previous'
    receipt = {'status': 'preparing', 'destination': str(destination), 'backup': str(backup)}
    moved = False
    try:
        os.write(descriptor, str(os.getpid()).encode())
        operation.mkdir(parents=True)
        if destination.is_symlink() or (destination / '.git').exists():
            raise RuntimeError('Target is a development checkout or symlink')
        if fingerprint(destination, True) != expected:
            raise RuntimeError('Installed files changed since provenance inspection')
        copy(str(source), str(staging))
        nested = staging / 'skills/frontend-architect-update'
        if nested.exists():
            shutil.move(str(nested), str(operation / 'normalized-nested-companion'))
            receipt['packagingNormalization'] = 'Nested companion saved outside discovery; independent companion unchanged'
        target = fingerprint(staging)
        check(staging)
        if fingerprint(destination, True) != expected:
            raise RuntimeError('Concurrent installed change before replacement')
        destination.rename(backup)
        moved = True
        staging.rename(destination)
        check(destination)
        if fingerprint(destination) != target:
            raise RuntimeError('Installed bytes differ from validated staging')
        receipt.update(status='complete', completedAt=datetime.now(timezone.utc).isoformat(), files=target)
        return receipt
    except Exception as error:
        receipt.update(status='failed', error=str(error))
        if moved:
            if destination.exists():
                destination.rename(operation / 'failed-candidate')
            backup.rename(destination)
            receipt['restoredPrevious'] = fingerprint(destination, True) == expected
        raise
    finally:
        try:
            if operation.exists():
                (operation / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        finally:
            os.close(descriptor)
            lock.unlink()


def self_test():
    with tempfile.TemporaryDirectory(prefix='frontend-install-check-') as directory:
        root = Path(directory)
        source, target = root / 'source', root / 'installed'
        source.mkdir(); target.mkdir()
        (source / 'SKILL.md').write_text('new')
        (target / 'SKILL.md').write_text('old')
        before = fingerprint(target)
        checks = []
        def reject_after_activation(path):
            checks.append(str(path))
            if path == target:
                raise RuntimeError('injected post-activation failure')
        try:
            activate(source, target, root / 'failure', root / 'stage-a', root / 'lock',
                     before, shutil.copytree, reject_after_activation)
        except RuntimeError as error:
            assert 'injected' in str(error)
        assert fingerprint(target) == before and not (root / 'lock').exists()
        assert json.loads((root / 'failure/receipt.json').read_text())['restoredPrevious']
        receipt = activate(source, target, root / 'success', root / 'stage-b', root / 'lock',
                           before, shutil.copytree, lambda path: None)
        assert receipt['status'] == 'complete' and fingerprint(target) == fingerprint(source)
        assert fingerprint(root / 'success/previous') == before
        print('Temporary activation, post-check failure restoration, backup and lock cleanup passed')


def install():
    verification = json.loads((RESULTS / 'run-plan.json').read_text())
    if verification['status'] != 'validated':
        raise RuntimeError('Behavioral review is not marked validated')
    inspected = json.loads((RESULTS / 'installed-before.json').read_text())
    if inspected['added'] or inspected['deleted'] or inspected['changed']:
        raise RuntimeError('Unapproved local installation changes')
    codex_root = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex'))
    destination = codex_root / 'skills/frontend-architect'
    helper = codex_root / 'skills/.system/skill-installer/scripts/install-skill-from-github.py'
    sys.path.insert(0, str(helper.parent))
    specification = importlib.util.spec_from_file_location('local_trusted_skill_installer', helper)
    installer = importlib.util.module_from_spec(specification)
    sys.modules[specification.name] = installer
    specification.loader.exec_module(installer)
    snapshot = Path(verification['installationSource'])
    manifest_path = Path(verification['installationSourceManifest'])
    source_manifest = json.loads(manifest_path.read_text())
    if fingerprint(snapshot) != source_manifest['files']:
        raise RuntimeError('Installation source differs from recorded snapshot manifest')
    installer._validate_skill(str(snapshot), str(snapshot))
    identity = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid4().hex[:8]
    operation = codex_root / 'skill-backups/frontend-architect' / identity
    staging = codex_root / 'skill-update-staging' / identity
    frozen = Path(verification.get('finalGuideSnapshot', RESULTS / 'frozen-inputs/candidate'))
    def check(path):
        for file in ['SKILL.md', 'CONTRIBUTING.md']:
            if (path / file).read_bytes() != (frozen / (Path(file).stem + '.snapshot.md')).read_bytes():
                raise RuntimeError('Installed entry or maintenance input differs from evaluated input')
        expected = fingerprint(frozen / 'references')
        if fingerprint(path / 'references') != expected:
            raise RuntimeError('Installed references differ from evaluated input')
    receipt = activate(snapshot, destination, operation, staging,
                       codex_root / 'skill-maintenance/frontend-architect.lock',
                       inspected['installedFiles'], installer._copy_skill, check)
    receipt.update(repository='https://github.com/hgw25/frontend-architect-skill',
                   sourceKind='local-development-snapshot', sourceRoot=str(SOURCE), sourceWasDirty=True,
                   sourceHead=verification['sourceHead'], sourceManifest=verification['installationSourceManifest'],
                   previousDeclaredVersion=inspected['declaredVersion'], previousTagCommit=None,
                   previousSourceHead=inspected['commit'],
                   previousSnapshotId=inspected['snapshotId'],
                   previousReceipt=inspected['referenceReceipt'],
                   previousReceiptSha256=inspected['referenceReceiptSha256'],
                   previousFiles=inspected['installedFiles'],
                   declaredVersion=(destination / 'VERSION').read_text().strip(),
                   snapshotId=verification['localSnapshotId'], tag=None,
                   sourceManifestSha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
                   evaluatedGuideSnapshot=str(frozen),
                   publishedVersionUnchanged=True)
    (operation / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    (RESULTS / 'installation-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({key: value for key, value in receipt.items() if key not in {'files', 'previousFiles'}}))


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        self_test()
    elif sys.argv[1:] == ['--activate']:
        install()
    else:
        raise SystemExit('Use --self-test or --activate after validation')
