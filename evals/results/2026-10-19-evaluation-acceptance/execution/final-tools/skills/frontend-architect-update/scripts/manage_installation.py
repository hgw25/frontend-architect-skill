#!/usr/bin/env python3
"""Activate or restore a staged frontend-architect installation without network access."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import uuid


NAME = 'frontend-architect'
SKILL_NAMES = {NAME, 'frontend-architect-update'}
EMBEDDED = Path('skills/frontend-architect-update')


def file_manifest(root: Path, *, normalized: bool = False) -> dict[str, str]:
    if not root.exists():
        return {}
    files = {}
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if '__pycache__' in relative.parts or path.suffix == '.pyc' or path.name == '.DS_Store':
            continue
        if normalized and (relative == EMBEDDED or EMBEDDED in relative.parents):
            continue
        if path.is_symlink():
            raise ValueError(f'Symlink needs an explicit maintenance target: {path}')
        if path.is_file():
            files[str(relative)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def validate_candidate(root: Path, tag: str = '', expected_name: str = NAME) -> str:
    entry = (root/'SKILL.md').read_text(encoding='utf-8')
    frontmatter = re.match(r'\A---\n(.*?)\n---(?:\n|$)', entry, re.S)
    if expected_name not in SKILL_NAMES or not frontmatter or not re.search(
            rf'^name: {re.escape(expected_name)}\s*$', frontmatter[1], re.M):
        raise ValueError(f'Candidate must declare name: {expected_name}')
    version = ((root/'VERSION').read_text(encoding='utf-8').strip()
               if (root/'VERSION').is_file() else 'unversioned' if expected_name != NAME else '')
    if not version:
        raise ValueError('Candidate VERSION is empty')
    if re.fullmatch(r'v\d+\.\d+\.\d+', tag) and version != tag[1:]:
        raise ValueError('Candidate VERSION differs from selected tag')
    for link in re.findall(r'\]\((references/[^)#]+)(?:#[^)]*)?\)', entry):
        if not (root/link).is_file():
            raise ValueError(f'Missing runtime reference: {link}')
    embedded = root/EMBEDDED/'SKILL.md'
    if embedded.exists() and not re.search(r'^name: frontend-architect-update\s*$', embedded.read_text(), re.M):
        raise ValueError('Unexpected skill at the companion normalization path')
    return version


def inspect_installation(destination: Path) -> dict:
    if destination.is_symlink():
        raise ValueError('Do not replace a symlink installation')
    if (destination/'.git').exists():
        raise ValueError('Do not replace a development checkout')
    if destination.exists() and not destination.is_dir():
        raise ValueError('Installation path must be a directory')
    return {
        'destination': str(destination), 'exists': destination.exists(),
        'version': (destination/'VERSION').read_text().strip() if (destination/'VERSION').is_file() else None,
        'files': file_manifest(destination),
    }


@contextmanager
def installation_lock(destination: Path):
    destination = destination.parent.resolve()/destination.name
    identity = hashlib.sha256(str(destination).encode()).hexdigest()[:16]
    # Lock identity must not depend on the caller's chosen backup location.
    lock_root = destination.parent.parent/f'.{NAME}-maintenance-locks'
    lock_root.mkdir(parents=True, exist_ok=True)
    lock = lock_root/f'{identity}.lock'
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    inode = os.fstat(descriptor).st_ino
    try:
        os.write(descriptor, json.dumps({'pid': os.getpid(), 'destination': str(destination)}).encode())
        yield
    finally:
        os.close(descriptor)
        if lock.exists() and lock.stat().st_ino == inode:
            lock.unlink()


def write_receipt(path: Path, receipt: dict) -> None:
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temporary.replace(path)


def verify_installation(destination: Path, expected: dict[str, str]) -> None:
    # The expected manifest was already validated with the selected skill identity.
    if not (destination/'SKILL.md').is_file():
        raise ValueError('Installed entry is missing')
    if file_manifest(destination) != expected:
        raise ValueError('Installed bytes differ from normalized candidate')


def activate(candidate: Path, destination: Path, backup_root: Path, *, baseline: Path | None = None,
             replace_local: bool = False, tag: str = '', commit: str = '',
             expected_current: dict | None = None, operation: str = 'activate', skill_name: str = NAME) -> dict:
    """One transaction for initial install, update, local preview and rollback."""
    candidate = candidate.resolve()
    destination = destination.parent.resolve()/destination.name
    backup_root = backup_root.resolve()
    if backup_root.is_relative_to(destination.parent):
        raise ValueError('Backups must be outside the skill discovery directory')
    if candidate == destination or candidate.is_relative_to(destination):
        raise ValueError('Candidate must be staged outside the destination')
    version = validate_candidate(candidate, tag, skill_name)
    candidate_files = file_manifest(candidate, normalized=True)
    destination.parent.mkdir(parents=True, exist_ok=True)
    backup_root.mkdir(parents=True, exist_ok=True)
    if destination.parent.stat().st_dev != backup_root.stat().st_dev:
        raise ValueError('Use a backup location on the installation filesystem for atomic recovery')
    with installation_lock(destination):
        before = inspect_installation(destination)
        if before['exists']:
            known = expected_current
            if baseline is not None:
                validate_candidate(baseline, expected_name=skill_name)
                known = file_manifest(baseline, normalized=True)
                current = file_manifest(destination, normalized=True)
            else:
                current = before['files']
            if (known is None or current != known) and not replace_local:
                raise ValueError('Local changes or unknown provenance; explicit replacement authorization required')
        if before['exists'] and before['files'] == candidate_files:
            return {'state': 'unchanged', 'destination': str(destination), 'version': version}
        transaction = backup_root/skill_name/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8])
        transaction.mkdir(parents=True)
        previous = transaction/'previous'
        staged = Path(tempfile.mkdtemp(prefix=f'.{NAME}-stage-', dir=backup_root))
        receipt = {
            'operation': operation, 'skill_name': skill_name, 'state': 'preparing', 'destination': str(destination),
            'repository': 'hgw25/frontend-architect-skill', 'tag': tag, 'commit': commit,
            'version': version, 'backup': str(previous) if before['exists'] else None,
            'previous_files': before['files'], 'candidate': str(candidate),
            'receipt': str(transaction/'receipt.json'), 'normalization': [],
        }
        write_receipt(transaction/'receipt.json', receipt)
        moved_previous = False
        activated = False
        try:
            shutil.copytree(candidate, staged, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '.DS_Store'))
            if (staged/EMBEDDED).exists():
                os.replace(staged/EMBEDDED, transaction/'embedded-companion')
                receipt['normalization'].append(str(EMBEDDED))
            expected = candidate_files
            verify_installation(staged, expected)
            if inspect_installation(destination) != before:
                raise ValueError('Installation changed while preparing replacement')
            if before['exists']:
                os.replace(destination, previous)
                moved_previous = True
            os.replace(staged, destination)
            activated = True
            verify_installation(destination, expected)
            receipt.update(state='completed', installed_files=expected,
                           completed_at=datetime.now(timezone.utc).isoformat())
            write_receipt(transaction/'receipt.json', receipt)
            return receipt
        except Exception as error:
            try:
                if activated and destination.exists():
                    os.replace(destination, transaction/'failed-installation')
                if moved_previous:
                    os.replace(previous, destination)
            except OSError as recovery_error:
                receipt.update(state='recovery_failed', error=str(error), recovery_error=str(recovery_error),
                               recovery_complete=False)
                write_receipt(transaction/'receipt.json', receipt)
                raise RuntimeError(f'Recovery incomplete; inspect {transaction}') from recovery_error
            receipt.update(state='restored' if before['exists'] else 'failed', error=str(error),
                           recovery_complete=not moved_previous or destination.exists())
            write_receipt(transaction/'receipt.json', receipt)
            raise
        finally:
            if staged.exists():
                # Retain preparation data outside discovery even when validation fails.
                os.replace(staged, transaction/'unactivated-candidate')


def rollback(destination: Path, backup_root: Path, *, receipt_path: Path | None = None,
             replace_local: bool = False, skill_name: str = NAME) -> dict:
    destination = destination.parent.resolve()/destination.name
    backup_root = backup_root.resolve()
    if receipt_path is None:
        receipts = []
        for path in (backup_root/skill_name).glob('*/receipt.json'):
            receipt = json.loads(path.read_text())
            if (receipt.get('state') == 'completed' and receipt.get('destination') == str(destination)
                    and receipt.get('backup') and Path(receipt['backup']).is_dir()):
                receipts.append((receipt['completed_at'], path))
        if not receipts:
            raise ValueError('No completed recoverable installation receipt')
        receipt_path = max(receipts)[1]
    receipt = json.loads(receipt_path.read_text())
    if receipt.get('state') != 'completed' or receipt.get('destination') != str(destination):
        raise ValueError('Rollback source is not a completed receipt for this destination')
    source = Path(receipt['backup']) if receipt.get('backup') else None
    if source is None or file_manifest(source) != receipt['previous_files']:
        raise ValueError('Rollback backup is missing or differs from its receipt')
    return activate(source, destination, backup_root, expected_current=receipt['installed_files'],
                    replace_local=replace_local, tag='rollback', commit='', operation='rollback', skill_name=skill_name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest='operation', required=True)
    for operation in ('inspect', 'activate', 'rollback'):
        sub = subparsers.add_parser(operation)
        sub.add_argument('--destination', type=Path, required=True)
        sub.add_argument('--skill-name', choices=sorted(SKILL_NAMES), default=NAME)
        if operation != 'inspect':
            sub.add_argument('--backup-root', type=Path, required=True)
            sub.add_argument('--replace-local', action='store_true')
        if operation == 'activate':
            sub.add_argument('--candidate', type=Path, required=True)
            sub.add_argument('--baseline', type=Path)
            sub.add_argument('--tag', default='')
            sub.add_argument('--commit', default='')
        if operation == 'rollback':
            sub.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    if args.operation == 'inspect':
        result = inspect_installation(args.destination)
    elif args.operation == 'activate':
        result = activate(args.candidate, args.destination, args.backup_root, baseline=args.baseline,
                          replace_local=args.replace_local, tag=args.tag, commit=args.commit, skill_name=args.skill_name)
    else:
        result = rollback(args.destination, args.backup_root, receipt_path=args.receipt,
                          replace_local=args.replace_local, skill_name=args.skill_name)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
