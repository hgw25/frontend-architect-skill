"""Verify repeats, provenance adjudication and refined captures without merging populations."""
from collections import Counter
from pathlib import Path
import hashlib
import json
import sys

RESULTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RESULTS / 'audit-tools/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer

batches = ['repeats-selected/recovery', 'repeats-selected/ui',
           'adjudication/main', 'adjudication/recovery-repeat', 'refinement', 'repeats-selected/refinement-ui']
errors, records, scores = [], [], []
for batch in batches:
    folder = RESULTS / batch
    refined = batch in ('refinement', 'repeats-selected/refinement-ui')
    runner.ROOT = scorer.ROOT = RESULTS / ('refinement/frozen-inputs/candidate' if refined else 'audit-tools')
    runner.CASES_PATH = runner.ROOT / 'evals/cases.yaml'
    for manifest in sorted(folder.glob('*/shard-*/manifest.json')):
        condition = manifest.parent.parent.name
        payload = json.loads(manifest.read_text())
        cases = {c['id']: c for c in runner.load_cases([r['id'] for r in payload['cases']])}
        for record in payload['cases']:
            case_dir = manifest.parent / record['id'] / record['mode']
            issues = scorer.captured_evidence_errors(record, cases[record['id']], case_dir)
            guide = Path(record['workspace']) / '.frontend-architect'
            frozen = RESULTS / ('refinement/frozen-inputs' if refined else 'frozen-inputs') / condition
            for p in [frozen / 'SKILL.snapshot.md', frozen / 'CONTRIBUTING.snapshot.md', *(frozen / 'references').glob('*.md')]:
                relative = str(p.relative_to(frozen)).replace('.snapshot.md', '.md')
                if (guide / relative).read_bytes() != p.read_bytes():
                    issues.append('Changed guidance: ' + relative)
            records.append({'batch': batch, 'condition': condition, 'id': record['id'], 'errors': issues,
                'newGeneration': not batch.startswith('adjudication/'),
                'validationExitCodes': [v['exit_code'] for v in record['validations']]})
        grade_path = manifest.parent / 'blind-scores/scores.json'
        rows = json.loads(grade_path.read_text())['conditions']['candidate']
        if any(r['verdict'] == 'invalid' or 'normalized_score' not in r for r in rows):
            errors.append('Unfinished or invalid supplemental grade: ' + str(manifest))
        if {r['id'] for r in rows} != {r['id'] for r in payload['cases']}:
            errors.append('Incomplete supplemental scores: ' + str(manifest))
        scores.extend({'batch': batch, 'condition': condition, **r} for r in rows)
    if len([r for r in records if r['batch'] == batch]) != (4 if batch in ('adjudication/main', 'refinement') else 2):
        errors.append('Incomplete batch: ' + batch)
for archive, hashes in [('audit-tools', 'audit-tools-hashes.json'), ('refinement/frozen-inputs', 'refinement/input-hashes.json')]:
    for relative, expected in json.loads((RESULTS / hashes).read_text()).items():
        if hashlib.sha256((RESULTS / archive / relative).read_bytes()).hexdigest() != expected:
            errors.append('Changed archived input: ' + archive + '/' + relative)
errors.extend({'batch': r['batch'], 'condition': r['condition'], 'id': r['id'], 'errors': r['errors']} for r in records if r['errors'])
environment = json.loads((RESULTS / 'environment.json').read_text())
for name, key in [('codex-wrapper.snapshot.py', 'wrapperSha256'), ('skills-disable.toml-value.txt', 'isolatedSkillConfigurationSha256')]:
    if hashlib.sha256((RESULTS / 'execution' / name).read_bytes()).hexdigest() != environment[key]:
        errors.append('Changed isolation archive: ' + name)
summary = {'errors': errors, 'records': records, 'scores': scores,
           'newGenerations': sum(r['newGeneration'] for r in records),
           'gradingOnlyCopies': sum(not r['newGeneration'] for r in records),
           'verdictsByBatch': {b: dict(Counter(r['verdict'] for r in scores if r['batch'] == b)) for b in batches}}
(RESULTS / 'supplemental-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in summary.items() if k not in ('records', 'scores')}, ensure_ascii=False))
raise SystemExit(bool(errors))
