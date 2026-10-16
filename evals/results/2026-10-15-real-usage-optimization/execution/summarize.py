"""Summarize targeted pairs and recheck immutable evidence with existing validators."""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import json
import sys

RESULTS = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
REPOSITORY = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(RESULTS / 'audit-tools/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer

plan = json.loads((RESULTS / 'run-plan.json').read_text())
cases = {case['id']: case for case in runner.load_cases(plan['cases'])}
errors, records, scores = [], [], {}
for condition in ('previous', 'candidate'):
    scores[condition] = {}
    for path in sorted((RESULTS / condition).glob('shard-*/manifest.json')):
        for record in json.loads(path.read_text())['cases']:
            folder = path.parent / record['id'] / record['mode']
            issues = scorer.captured_evidence_errors(record, cases[record['id']], folder)
            guide = Path(record['workspace']) / '.frontend-architect'
            frozen = RESULTS / 'frozen-inputs' / condition
            for name in ['SKILL.md', 'CONTRIBUTING.md', *[
                    str(f.relative_to(frozen)) for f in (frozen / 'references').glob('*.md')]]:
                original = frozen / (Path(name).stem + '.snapshot.md' if '/' not in name else name)
                if (guide / name).read_bytes() != original.read_bytes():
                    issues.append('Changed guidance: ' + name)
            records.append({'condition': condition, 'id': record['id'], 'errors': issues,
                            'validationExitCodes': [v['exit_code'] for v in record['validations']]})
    for path in (RESULTS / condition).glob('shard-*/blind-scores/scores.json'):
        for score in json.loads(path.read_text())['conditions']['candidate']:
            if score['verdict'] == 'invalid' or 'normalized_score' not in score:
                errors.append('Unfinished or invalid score: ' + condition + '/' + score['id'])
            if score['id'] in scores[condition]:
                errors.append('Duplicated score: ' + condition + '/' + score['id'])
            scores[condition][score['id']] = score
    if set(scores[condition]) != set(cases):
        errors.append('Incomplete scored cases: ' + condition)
    if sorted(r['id'] for r in records if r['condition'] == condition) != sorted(cases):
        errors.append('Incomplete or duplicated captures: ' + condition)
for relative, expected in json.loads((RESULTS / 'input-hashes.json').read_text()).items():
    if hashlib.sha256((RESULTS / 'frozen-inputs' / relative).read_bytes()).hexdigest() != expected:
        errors.append('Changed frozen input: ' + relative)
for name in ['SKILL.md', 'CONTRIBUTING.md', *[
        str(p.relative_to(REPOSITORY)) for p in (REPOSITORY / 'references').glob('*.md')]]:
    final_guide = Path(plan.get('finalGuideSnapshot', RESULTS / 'frozen-inputs/candidate'))
    archived = final_guide / (Path(name).stem + '.snapshot.md' if '/' not in name else name)
    if (REPOSITORY / name).read_bytes() != archived.read_bytes():
        errors.append('Current guide differs: ' + name)
errors.extend({'condition': r['condition'], 'id': r['id'], 'errors': r['errors']} for r in records if r['errors'])
summary = {'counts': {c: dict(Counter(s['verdict'] for s in rows.values())) for c, rows in scores.items()},
           'errors': errors, 'records': records, 'pairs': []}
for case in plan['cases']:
    if not all(case in scores[c] for c in scores):
        continue
    before, after = (scores[c][case] for c in ('previous', 'candidate'))
    summary['pairs'].append({'id': case, 'previousScore': before.get('normalized_score'),
                            'candidateScore': after.get('normalized_score'),
                            'previousVerdict': before['verdict'], 'candidateVerdict': after['verdict'],
                            'previousFailures': before.get('case_failures', []) + before.get('global_failures', []),
                            'candidateFailures': after.get('case_failures', []) + after.get('global_failures', [])})
(RESULTS / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
with (RESULTS / 'comparison.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(summary['pairs'][0]) if summary['pairs'] else ['id'])
    writer.writeheader(); writer.writerows(summary['pairs'])
print(json.dumps({'counts': summary['counts'], 'errors': errors, 'pairs': summary['pairs']}, ensure_ascii=False))
raise SystemExit(bool(errors))
