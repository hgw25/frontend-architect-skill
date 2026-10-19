"""Summarize raw captures; never turn a score into an implementation assertion."""
from pathlib import Path
import json
import sys

root = Path(sys.argv[1])
rows = []
for manifest_path in sorted(root.rglob('manifest.json')):
    if 'artifacts' in manifest_path.parts or 'frozen-inputs' in manifest_path.parts:
        continue
    group = manifest_path.parent
    manifest = json.loads(manifest_path.read_text())
    score_path = group / 'blind-scores/scores.json'
    scores = json.loads(score_path.read_text()).get('conditions', {}) if score_path.exists() else {}
    for capture in manifest['cases']:
        folder = group / capture['id'] / capture['mode']
        score = next((entry for entry in scores.get(capture['mode'], [])
                      if entry['id'] == capture['id']), {})
        documents = [str(path.relative_to(folder / 'artifacts'))
                     for path in (folder / 'artifacts').rglob('*.md')
                     if not set(path.parts).intersection({'test-results', 'playwright-report'})]
        rows.append({
            'group': str(group.relative_to(root)), 'id': capture['id'], 'mode': capture['mode'],
            'generation': capture['generation'], 'validations': capture['validations'],
            'read_audit_status': capture['reference_routing']['read_audit_status'],
            'skill_isolation_ok': capture['reference_routing']['skill_isolation_ok'],
            'local_skill_read': capture['reference_routing']['local_skill_read'],
            'references': capture['reference_routing']['content_files'],
            'score': score, 'scoring_state': 'scored' if score else 'not_requested',
            'documents': documents,
        })
(root / 'outcomes.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
for row in rows:
    print(row['group'], row['mode'], row['score'].get('verdict', 'not_scored'),
          [(entry['command'], entry['exit_code']) for entry in row['validations']])
