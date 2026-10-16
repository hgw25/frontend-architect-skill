"""Keep the newly found ABA diagnostic separate from original five-check captures."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
STAGE = Path(json.loads((RESULTS / 'run-plan.json').read_text())['stage'])
OUT = RESULTS / 'draft-revision'
OUT.mkdir(exist_ok=True)
fixture = SOURCE / 'evals/fixtures/interaction-journey'
protected = ['package.json', 'package-lock.json', 'playwright.config.mjs', 'scripts/serve.mjs', 'tests/journey.spec.mjs']
records = []
inputs = [('original', fixture), ('positive', STAGE / 'positive-interaction-journey')]
for batch, pattern in [('main', '*/shard-*/manifest.json'), ('repeat', 'repeats-selected/ui/*/shard-*/manifest.json')]:
    for manifest in sorted(RESULTS.glob(pattern)):
        condition = manifest.parent.parent.name
        for record in json.loads(manifest.read_text())['cases']:
            if record['id'] == 'settled-interaction-journey-executable':
                inputs.append((batch + '-' + condition, Path(record['workspace'])))
for label, source in inputs:
    target = STAGE / ('draft-check-' + label)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('.git', '.frontend-architect', 'node_modules', 'test-results', '__pycache__'))
    shutil.copy2(fixture / 'tests/journey.spec.mjs', target / 'tests/journey.spec.mjs')
    commands = [['npm', 'ci'], ['npx', 'playwright', 'install', 'chromium'], ['npm', 'run', 'check']]
    checks = []
    with (OUT / (label + '.log')).open('w') as log:
        for command in commands:
            log.write('COMMAND: ' + repr(command) + '\n'); log.flush()
            completed = subprocess.run(command, cwd=target, stdout=log, stderr=subprocess.STDOUT)
            checks.append({'command': command, 'exitCode': completed.returncode})
            if completed.returncode and command != commands[-1]:
                raise RuntimeError('Diagnostic preparation failed: ' + label)
    records.append({'label': label, 'source': str(source), 'workspace': str(target), 'checks': checks,
                    'protectedUnchanged': {p: (target / p).read_bytes() == (fixture / p).read_bytes() for p in protected}})
(OUT / 'diagnostic.json').write_text(json.dumps({'acceptanceVersion': 2, 'purpose': 'Additional diagnostic, not a replacement for original captures',
    'testSha256': hashlib.sha256((fixture / 'tests/journey.spec.mjs').read_bytes()).hexdigest(), 'records': records}, indent=2) + '\n')
print(json.dumps(records, indent=2))
