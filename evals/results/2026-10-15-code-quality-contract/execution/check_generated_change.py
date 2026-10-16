"""Probe both generated operation boundaries in copies, retaining original captures."""
from pathlib import Path
import difflib
import hashlib
import json
import shutil
import subprocess

RESULTS = Path(__file__).resolve().parent.parent
records = []
for condition in ('previous', 'candidate'):
    manifest = json.loads((RESULTS / condition / 'shard-1/manifest.json').read_text())
    record = manifest['cases'][0]
    workspace = Path(record['workspace'])
    trial = RESULTS / 'change-trials' / condition
    before, after = trial / 'before', trial / 'after'
    shutil.copytree(workspace, before, ignore=shutil.ignore_patterns('.git', '.frontend-architect', 'node_modules', '__pycache__'))
    shutil.copytree(before, after)
    owner = after / 'src/export-selection.mjs'
    text = owner.read_text()
    if condition == 'previous':
        assert 'function createExportPayload(ids)' in text and 'await write(createExportPayload(decision.ids));' in text
        text = text.replace('function createExportPayload(ids)', 'async function createExportPayload(ids)')
        text = text.replace('  return { schema: 1,', '  await Promise.resolve();\n  return { schema: 1,')
        text = text.replace('  await write(createExportPayload(decision.ids));',
                            '  const payload = await createExportPayload(decision.ids);\n  await write(payload);')
    else:
        line = '  const payload = { schema: 1, document_ids: decision.ids };'
        assert line in text
        text = text.replace(line, '  await Promise.resolve();\n' + line)
    owner.write_text(text)
    checks = []
    for label, folder in [('before', before), ('after', after)]:
        command = ['node', '--test', 'test/export.test.mjs']
        outcome = subprocess.run(command, cwd=folder, capture_output=True, text=True)
        (trial / (label + '.log')).write_text('COMMAND: ' + repr(command) + '\n' + outcome.stdout + outcome.stderr)
        assert outcome.returncode == 0, outcome.stdout + outcome.stderr
        checks.append({'phase': label, 'exitCode': outcome.returncode})
    changed = []
    for file in sorted((before / 'src').glob('*.mjs')):
        if file.read_bytes() != (after / file.relative_to(before)).read_bytes():
            changed.append(str(file.relative_to(before)))
    assert changed == ['src/export-selection.mjs']
    contract = 'test/export.test.mjs'
    assert (before / contract).read_bytes() == (after / contract).read_bytes()
    (trial / 'changes.diff').write_text(''.join(difflib.unified_diff(
        (before / 'src/export-selection.mjs').read_text().splitlines(True), owner.read_text().splitlines(True),
        fromfile='before/src/export-selection.mjs', tofile='after/src/export-selection.mjs')))
    records.append({'condition': condition, 'changedFiles': changed, 'publicEntryPointsUnchanged': True,
                    'checks': checks, 'protectedTestSha256': hashlib.sha256((after / contract).read_bytes()).hexdigest()})
(RESULTS / 'generated-change-check.json').write_text(json.dumps({'records': records,
    'limit': 'Maintainer-authored controlled change in copies, not another generated sample or human timing measurement'}, indent=2) + '\n')
print(json.dumps(records))
