"""Freeze a separately versioned acceptance refinement after the retained ABA failure."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import shutil
import sys
import run_suite as first

ROOT_RESULTS = first.RESULTS
SOURCE = ROOT_RESULTS.parents[2]
STAGE = first.STAGE / 'draft-refinement'
RESULTS = ROOT_RESULTS / 'refinement'
IDS = ['settled-interaction-journey-executable', 'simplify-without-erasing-operation-owner']
STAGE.mkdir(); RESULTS.mkdir()
for condition in ('previous', 'candidate'):
    target = STAGE / condition
    shutil.copytree(first.STAGE / condition, target, ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copy2(SOURCE / 'evals/cases.yaml', target / 'evals/cases.yaml')
    shutil.copy2(SOURCE / 'evals/fixtures/interaction-journey/tests/journey.spec.mjs',
                 target / 'evals/fixtures/interaction-journey/tests/journey.spec.mjs')
    if condition == 'candidate':
        shutil.copy2(SOURCE / 'references/async-and-lifecycles.md', target / 'references/async-and-lifecycles.md')
    archived = RESULTS / 'frozen-inputs' / condition
    shutil.copytree(target, archived)
    (archived / 'SKILL.md').rename(archived / 'SKILL.snapshot.md')
    (archived / 'CONTRIBUTING.md').rename(archived / 'CONTRIBUTING.snapshot.md')
    (RESULTS / condition).mkdir()
hashes = {str(p.relative_to(RESULTS / 'frozen-inputs')): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in (RESULTS / 'frozen-inputs').rglob('*') if p.is_file()}
(RESULTS / 'input-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
(RESULTS / 'plan.json').write_text(json.dumps({
    'cases': IDS, 'model': first.PLAN['model'], 'reasoning_effort': first.PLAN['reasoning_effort'],
    'acceptanceVersion': 2, 'browserChecks': 6, 'readAuditVersion': 6, 'gradingView': 2,
    'purpose': 'Verify separately refined guidance and acceptance after original ABA failure; not a replacement repeat',
    'changes': ['candidate async reference adds edit-version ownership', 'both conditions receive the same extra ABA browser check and case observation'],
    'stage': str(STAGE), 'generationTimeoutSeconds': 900,
}, indent=2) + '\n')
first.STAGE = STAGE
first.RESULTS = RESULTS
with ThreadPoolExecutor(max_workers=2) as pool:
    outcomes = list(pool.map(lambda item: first.worker(*item), enumerate([[IDS[0]], [IDS[1]]], 1)))
(RESULTS / 'outcome.json').write_text(json.dumps(outcomes, indent=2) + '\n')
raise SystemExit(0 if all(o.get('status') == 'finished' and all(code == 0 for code in o['scoring_exit_codes'].values()) for o in outcomes) else 1)
