"""Check immutable inputs and report main pairs separately from one capture recovery."""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import json
import sys

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
sys.path.insert(0, str(RESULTS / 'scoring-tools/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer

plan = json.loads((RESULTS / 'run-plan.json').read_text())
cases = {c['id']: c for c in runner.load_cases(plan['cases'])}
errors, pairs, records, invalid = [], [], [], []


def inspect_record(condition, manifest, record, origin):
    folder = manifest.parent / Path(record['response']).parent
    issues = scorer.captured_evidence_errors(record, cases[record['id']], folder)
    guide = Path(record['workspace']) / '.frontend-architect'
    frozen = RESULTS / 'frozen-inputs' / condition
    for name in ['SKILL.md', 'CONTRIBUTING.md', *[
            str(p.relative_to(frozen)) for p in (frozen / 'references').glob('*.md')]]:
        archived = frozen / (Path(name).stem + '.snapshot.md' if '/' not in name else name)
        if (guide / name).read_bytes() != archived.read_bytes():
            issues.append('Changed guidance: ' + name)
    return {'condition': condition, 'id': record['id'], 'origin': origin,
            'manifest': str(manifest.relative_to(RESULTS)), 'errors': issues,
            'generation': record['generation'], 'validationExitCodes': [v['exit_code'] for v in record['validations']]}


for case_id in plan['cases']:
    recovery = case_id == 'accessible-dialog-primitive'
    root = RESULTS / 'capture-recovery' if recovery else RESULTS
    score_root = root if recovery else RESULTS / 'scoring-evidence-complete'
    matched = {}
    for condition in ('previous', 'candidate'):
        for manifest in sorted((root / condition).glob('shard-*/manifest.json')):
            for record in json.loads(manifest.read_text())['cases']:
                if record['id'] != case_id:
                    continue
                checked = inspect_record(condition, manifest, record, 'capture recovery' if recovery else 'main')
                records.append(checked)
                if checked['errors']:
                    invalid.append(checked)
                    continue
                score_path = score_root / condition / manifest.parent.name / 'blind-scores/scores.json'
                if not score_path.exists():
                    errors.append('Missing score: ' + str(score_path))
                    continue
                score = next(s for s in json.loads(score_path.read_text())['conditions']['candidate'] if s['id'] == case_id)
                if score['verdict'] == 'invalid':
                    errors.append('Unfinished score: ' + str(score_path))
                    continue
                matched[condition] = score
    if len(matched) == 2:
        before, after = matched['previous'], matched['candidate']
        pairs.append({'id': case_id, 'origin': 'capture recovery' if recovery else 'main',
                      'previousScore': before['normalized_score'], 'candidateScore': after['normalized_score'],
                      'previousVerdict': before['verdict'], 'candidateVerdict': after['verdict'],
                      'previousFailures': before.get('case_failures', []) + before.get('global_failures', []),
                      'candidateFailures': after.get('case_failures', []) + after.get('global_failures', [])})

# The original timeout remains visible even when a separate pair completes.
initial = RESULTS / 'previous/shard-3/manifest.json'
for record in json.loads(initial.read_text())['cases']:
    if record['id'] == 'accessible-dialog-primitive':
        invalid.append(inspect_record('previous', initial, record, 'original timed-out capture'))

for folder, manifest_name in [('frozen-inputs', 'input-hashes.json'), ('scoring-tools', 'scoring-tools-hashes.json')]:
    for name, expected in json.loads((RESULTS / manifest_name).read_text()).items():
        if hashlib.sha256((RESULTS / folder / name).read_bytes()).hexdigest() != expected:
            errors.append('Changed input: ' + folder + '/' + name)
frozen = Path(plan.get('finalGuideSnapshot', RESULTS / 'frozen-inputs/candidate'))
for name in ['SKILL.md', 'CONTRIBUTING.md', *[str(p.relative_to(SOURCE)) for p in (SOURCE / 'references').glob('*.md')]]:
    archived = frozen / (Path(name).stem + '.snapshot.md' if '/' not in name else name)
    if (SOURCE / name).read_bytes() != archived.read_bytes():
        errors.append('Current guidance differs: ' + name)

summary = {'errors': errors, 'pairs': pairs, 'records': records, 'invalidSamples': invalid,
           'counts': {c: dict(Counter(p[c + 'Verdict'] for p in pairs)) for c in ('previous', 'candidate')},
           'unpairedCases': [case_id for case_id in plan['cases'] if not any(p['id'] == case_id for p in pairs)]}
(RESULTS / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
with (RESULTS / 'comparison.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(pairs[0]))
    writer.writeheader(); writer.writerows(pairs)
print(json.dumps({k: summary[k] for k in ('counts', 'errors', 'pairs', 'unpairedCases')}, ensure_ascii=False))
raise SystemExit(bool(errors))
