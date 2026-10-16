"""Bind activated contents and recovery material to the recorded local snapshot."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
from install_snapshot import fingerprint, NESTED_COMPANION

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
receipt = json.loads((RESULTS / 'installation-receipt.json').read_text())
manifest_path = Path(receipt['sourceManifest'])
source = json.loads(manifest_path.read_text())
expected = {p: h for p, h in source['files'].items() if not p.startswith(NESTED_COMPANION)}
target, backup = Path(receipt['destination']), Path(receipt['backup'])
companion = json.loads((RESULTS / 'companion-before.json').read_text())
checks = {
    'receiptComplete': receipt['status'] == 'complete',
    'sourceManifestUnchanged': hashlib.sha256(manifest_path.read_bytes()).hexdigest() == receipt['sourceManifestSha256'],
    'installedMatchesSource': fingerprint(target) == expected,
    'installedMatchesReceipt': fingerprint(target) == receipt['files'],
    'backupMatchesPrevious': fingerprint(backup, True) == receipt['previousFiles'],
    'companionUnchanged': fingerprint(Path(companion['path'])) == companion['files'],
    'declaredVersionUnchanged': (target / 'VERSION').read_text().strip() == '0.4.2',
    'singleSkillEntry': sorted(str(p.relative_to(target)) for p in target.rglob('SKILL.md')) == ['SKILL.md'],
    'lockReleased': not (target.parents[1] / 'skill-maintenance/frontend-architect.lock').exists(),
}
for p in [SOURCE / 'SKILL.md', SOURCE / 'CONTRIBUTING.md', *(SOURCE / 'references').glob('*.md')]:
    relative = str(p.relative_to(SOURCE))
    checks['currentSource:' + relative] = (target / relative).read_bytes() == p.read_bytes()
command = [sys.executable, str(target.parents[0] / '.system/skill-creator/scripts/quick_validate.py'), str(target)]
validation = subprocess.run(command, capture_output=True, text=True)
checks['officialInstalledValidation'] = validation.returncode == 0
result = {'checks': checks, 'files': len(expected), 'snapshotId': receipt['snapshotId'],
          'officialValidation': {'command': command, 'exitCode': validation.returncode, 'stdout': validation.stdout, 'stderr': validation.stderr},
          'allPassed': all(checks.values())}
(RESULTS / 'installation-post-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(0 if result['allPassed'] else 1)
