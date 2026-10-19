"""Combine independent scoring with this experiment's observed artifact evidence."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
overrides = {
    ('candidate-main', 'autonomous-feature-development', 'candidate'):
        'Independent Mermaid parse failed for the data-flow sequence diagram.',
    ('candidate-v2-design', 'autonomous-architecture-design', 'candidate'):
        'Actual artifact check failed: complete chat design but no saved document.',
    ('candidate-review', 'autonomous-review-contracts', 'candidate'):
        'Evidence review: absent host integration was reported as a confirmed defect.',
}
rows = []
for group in sorted(root.iterdir()):
    if not (group / 'manifest.json').exists():
        continue
    manifest = json.loads((group / 'manifest.json').read_text())
    score = json.loads((group / 'blind-scores/scores.json').read_text())
    scores = {(case['id'], mode): case for mode, cases in score['conditions'].items()
              for case in cases}
    artifacts = json.loads((group / 'artifact-checks.json').read_text())
    checks = {(case['id'], case['mode']): case['passed'] for case in artifacts}
    for record in manifest['cases']:
        key = (record['id'], record['mode'])
        scored = scores[key]
        verdict = scored['verdict']
        reason = overrides.get((group.name, *key))
        if reason:
            verdict = 'fail'
        rows.append({
            'group': group.name, 'id': key[0], 'mode': key[1],
            'blind_verdict': scored['verdict'], 'combined_verdict': verdict,
            'override_reason': reason,
            'generation_exit_code': record['generation']['exit_code'],
            'validations': record['validations'],
            'artifact_check': checks.get(key),
            'invalid_reasons': scored.get('invalid_reasons', []),
        })
payload = {
    'scope': 'Case-level evidence, not a statistical capability estimate',
    'final_path_groups': ['candidate-v2-development', 'candidate-v3-maintainability',
                         'candidate-v3-contracts', 'candidate-v4-design'],
    'local_edit_control_group': 'candidate-local',
    'cases': rows,
}
(root / 'outcomes.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
print([(row['group'], row['id'], row['mode'], row['combined_verdict']) for row in rows])
