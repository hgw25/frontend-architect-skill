"""Apply the bounded metadata grammar to unchanged raw events, preserving v5."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

RESULTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RESULTS / 'audit-tools/scripts'))
from run_behavior_evals import analyze_reference_reads, capture_errors

section = sys.argv[1]
root = RESULTS if section == 'main' else RESULTS / 'repeats-selected/recovery'
proof = []
paths = [root / sys.argv[2] / 'manifest.json'] if len(sys.argv) > 2 else sorted(root.glob('*/shard-*/manifest.json'))
for path in paths:
    saved = path.with_name('manifest.audit-v5.json')
    if not saved.exists():
        shutil.copy2(path, saved)
    baseline = {r['id']: r for r in json.loads(saved.read_text())['cases']}
    manifest = json.loads(path.read_text())
    for record in manifest['cases']:
        before = baseline[record['id']]['reference_routing']
        events = (path.parent / record['id'] / record['mode'] / 'events.jsonl').read_bytes()
        assert hashlib.sha256(events).hexdigest() == record['events_sha256']
        after = analyze_reference_reads(events.decode(), Path(record['workspace']))
        for key in before:
            if key not in {'read_audit_version', 'read_audit_status', 'unknown_reads'}:
                assert before[key] == after[key], (record['id'], key)
        assert after['read_audit_status'] == 'recognized', (record['id'], after['unknown_reads'])
        record['reference_routing'] = after
        assert not capture_errors(record), (record['id'], capture_errors(record))
        proof.append({'manifest': str(path.relative_to(RESULTS)), 'id': record['id'],
                      'before': before, 'after': after, 'eventsUnchanged': True})
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
label = section + ('-' + sys.argv[2].replace('/', '-') if len(sys.argv) > 2 else '')
(RESULTS / ('audit-repair-' + label + '.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'section': section, 'records': len(proof),
                  'metadataFalsePositivesRepaired': sum(p['before']['read_audit_status'] != 'recognized' for p in proof)}))
