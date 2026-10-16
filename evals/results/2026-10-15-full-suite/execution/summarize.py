"""Summarize captured facts without replacing independent model scoring."""
from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parent.parent
PLAN = json.loads((ROOT / 'run-plan.json').read_text())
IDS = [case for shard in PLAN['shards'] for case in shard]
captured, scored = {}, {}
for version in ('previous', 'candidate'):
    captured[version], scored[version] = {}, {}
    for manifest in (ROOT / version).glob('shard-*/manifest.json'):
        for record in json.loads(manifest.read_text())['cases']:
            captured[version][record['id']] = record
    for path in (ROOT / version).glob('shard-*/blind-scores/scores.json'):
        for score in json.loads(path.read_text())['conditions'].get('candidate', []):
            scored[version][score['id']] = score

rows = []
for case in IDS:
    row = {'case': case}
    for version in ('previous', 'candidate'):
        record = captured[version].get(case)
        score = scored[version].get(case, {})
        row[version + '_capture'] = 'missing' if record is None else (
            'completed' if record['generation']['exit_code'] == 0 else 'generation_failed')
        row[version + '_verdict'] = score.get('verdict', 'unscored')
        row[version + '_score'] = score.get('normalized_score')
    a, b = row['previous_score'], row['candidate_score']
    row['delta'] = round(b - a, 2) if a is not None and b is not None else None
    rows.append(row)

summary = {'status': PLAN.get('status'), 'total_cases': len(IDS), 'conditions': {}}
for version in ('previous', 'candidate'):
    scores = list(scored[version].values())
    valid = [s for s in scores if s.get('verdict') != 'invalid' and 'normalized_score' in s]
    summary['conditions'][version] = {
        'captured': len(captured[version]), 'scored': len(valid),
        'invalid': sum(s.get('verdict') == 'invalid' for s in scores),
        'failed': sum(s.get('verdict') == 'fail' for s in scores),
        'target': sum(s.get('verdict') == 'target' for s in scores),
        'mean_valid_score': round(sum(s['normalized_score'] for s in valid) / len(valid), 2) if valid else None,
    }
summary['score_declines'] = [r['case'] for r in rows if r['delta'] is not None and r['delta'] < 0]
summary['candidate_only_failures'] = [r['case'] for r in rows if r['candidate_verdict'] == 'fail' and r['previous_verdict'] not in ('fail', 'invalid', 'unscored')]
summary['primary_score_changes'] = {
    label: sum(r['delta'] is not None and test(r['delta']) for r in rows)
    for label, test in [('increased', lambda d: d > 0), ('equal', lambda d: d == 0), ('decreased', lambda d: d < 0)]
}

repeated = {'previous': {}, 'candidate': {}}
for version in repeated:
    paths = list((ROOT / 'repeats-executable' / version).glob('shard-*/blind-scores/scores.json'))
    paths += list((ROOT / 'repeats-selected').glob('*/' + version + '/shard-*/blind-scores/scores.json'))
    for path in paths:
        for score in json.loads(path.read_text())['conditions']['candidate']:
            assert score['id'] not in repeated[version], ('Duplicate repeat case', version, score['id'])
            repeated[version][score['id']] = score

repeat_rows = []
for row in rows:
    case = row['case']
    if case not in repeated['previous'] and case not in repeated['candidate']:
        continue
    result = {'case': case}
    for version in repeated:
        score = repeated[version].get(case, {})
        result[version + '_primary_score'] = row[version + '_score']
        result[version + '_primary_verdict'] = row[version + '_verdict']
        result[version + '_repeat_score'] = score.get('normalized_score')
        result[version + '_repeat_verdict'] = score.get('verdict', 'unscored')
    repeat_rows.append(result)
summary['repeats'] = {
    'cases': len(repeat_rows), 'conditions': {
        version: {'scored': sum(s.get('verdict') != 'invalid' for s in scores.values()),
                  'target': sum(s.get('verdict') == 'target' for s in scores.values()),
                  'failed': sum(s.get('verdict') == 'fail' for s in scores.values()),
                  'invalid': sum(s.get('verdict') == 'invalid' for s in scores.values())}
        for version, scores in repeated.items()
    },
    'candidate_only_failures': [r['case'] for r in repeat_rows if r['candidate_repeat_verdict'] == 'fail' and r['previous_repeat_verdict'] == 'target'],
    'shared_failures': [r['case'] for r in repeat_rows if r['candidate_repeat_verdict'] == r['previous_repeat_verdict'] == 'fail'],
    'primary_declines_equal_in_repeat': [r['case'] for r in repeat_rows if r['case'] in summary['score_declines'] and r['previous_repeat_score'] == r['candidate_repeat_score']],
}
reviewed = {}
for version in ('previous', 'candidate'):
    path = ROOT / 'adjudication/vite-execution-evidence-final' / version / 'shard-1/blind-scores/scores.json'
    if path.exists():
        reviewed[version] = json.loads(path.read_text())['conditions']['candidate'][0]
if len(reviewed) == 2:
    summary['supplementary_vite_review'] = {
        version: {'score': score.get('normalized_score'), 'verdict': score['verdict']}
        for version, score in reviewed.items()
    }
    summary['targets_after_vite_verdict_review'] = {
        version: summary['conditions'][version]['target']
                 - int(scored[version]['vite-feature-flags-plugin']['verdict'] == 'target')
                 + int(reviewed[version]['verdict'] == 'target')
        for version in reviewed
    }

(ROOT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
with (ROOT / 'comparison.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
if repeat_rows:
    with (ROOT / 'repeats-comparison.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(repeat_rows[0]))
        writer.writeheader()
        writer.writerows(repeat_rows)
print(json.dumps(summary, ensure_ascii=False))
