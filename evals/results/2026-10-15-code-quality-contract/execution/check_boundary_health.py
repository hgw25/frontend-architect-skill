"""Record behavior parity and the actual cost of an internal async change."""
from pathlib import Path
import difflib
import hashlib
import json
import shutil
import subprocess

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
stage = Path(json.loads((RESULTS / 'run-plan.json').read_text())['stage'])
review = SOURCE / 'evals/fixtures/export-operation-review'
records = []

def check(label, folder, expected):
    command = ['node', '--test', 'test/export.test.mjs']
    result = subprocess.run(command, cwd=folder, capture_output=True, text=True)
    (RESULTS / (label + '.log')).write_text('COMMAND: ' + repr(command) + '\n' + result.stdout + result.stderr)
    assert (result.returncode == 0) == expected, label
    records.append({'label': label, 'workspace': str(folder), 'command': command, 'exitCode': result.returncode})

def difference(before, after, label):
    changed = []
    chunks = []
    for path in sorted((before / 'src').glob('*.mjs')):
        relative = path.relative_to(before)
        target = after / relative
        if path.read_bytes() != target.read_bytes():
            changed.append(str(relative))
            chunks.extend(difflib.unified_diff(path.read_text().splitlines(True), target.read_text().splitlines(True),
                                               fromfile='before/' + str(relative), tofile='after/' + str(relative)))
    (RESULTS / (label + '.diff')).write_text(''.join(chunks))
    return changed

check('initial', SOURCE / 'evals/fixtures/export-operation', True)
check('review-before', review / 'before', True)
check('review-after', review / 'after', True)
coupled, cohesive = stage / 'async-coupled', stage / 'async-cohesive'
shutil.copytree(review / 'after', coupled)
shutil.copytree(review / 'before', cohesive)
steps = coupled / 'src/export-steps.mjs'
steps.write_text(steps.read_text().replace('function encode(context)', 'async function encode(context)')
                 .replace('    context.payload =', '    await Promise.resolve();\n    context.payload ='))
check('async-coupled-before-consumer-fix', coupled, False)
for name in ('toolbar', 'keyboard'):
    caller = coupled / f'src/{name}.mjs'
    caller.write_text(caller.read_text().replace('  encode(context);', '  await encode(context);'))
check('async-coupled-with-consumer-fix', coupled, True)
owner = cohesive / 'src/export-selection.mjs'
owner.write_text(owner.read_text().replace('  const payload =', '  await Promise.resolve();\n  const payload ='))
check('async-cohesive', cohesive, True)
test_hash = hashlib.sha256((review / 'before/test/export.test.mjs').read_bytes()).hexdigest()
assert all(hashlib.sha256((folder / 'test/export.test.mjs').read_bytes()).hexdigest() == test_hash
           for folder in (review / 'after', coupled, cohesive))
result = {'records': records, 'protectedTestSha256': test_hash,
          'coupledChangedFiles': difference(review / 'after', coupled, 'async-coupled'),
          'cohesiveChangedFiles': difference(review / 'before', cohesive, 'async-cohesive'),
          'limits': 'Controlled encoding delay preserves the public contract; not a human maintenance timing study'}
(RESULTS / 'fixture-health.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
