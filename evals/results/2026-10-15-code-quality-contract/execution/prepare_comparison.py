"""Prepare two guide conditions with the same tasks, rubric and existing eval tools."""
from pathlib import Path
import hashlib
import json
import shutil
import tomllib

RESULTS = Path(__file__).resolve().parent.parent
SOURCE = RESULTS.parents[2]
plan_path = RESULTS / 'run-plan.json'
plan = json.loads(plan_path.read_text())
stage = Path(plan['stage'])
previous_results = SOURCE / 'evals/results/2026-10-15-real-usage-optimization'
old_stage = Path(json.loads((previous_results / 'run-plan.json').read_text())['stage'])
bin_dir = stage / 'bin'
bin_dir.mkdir()
shutil.copy2(old_stage / 'bin/codex', bin_dir / 'codex')
configuration = tomllib.loads((old_stage / 'bin/skills-disable.toml-value.txt').read_text())['skills']['config']
disabled = {item['path'] for item in configuration}
for root in (Path.home() / '.codex/skills', Path.home() / '.agents/skills'):
    disabled.update(str(path.parent) for path in root.rglob('SKILL.md'))
value = 'skills.config=[' + ','.join('{path=' + json.dumps(path) + ',enabled=false}' for path in sorted(disabled)) + ']'
(bin_dir / 'skills-disable.toml-value.txt').write_text(value)
for condition in ('previous', 'candidate'):
    target = stage / condition
    if condition == 'candidate':
        target.mkdir()
        for name in ('SKILL.md', 'CONTRIBUTING.md'):
            shutil.copy2(SOURCE / name, target / name)
        shutil.copytree(SOURCE / 'references', target / 'references')
    shutil.copytree(SOURCE / 'scripts', target / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
    (target / 'evals').mkdir()
    for name in ('cases.yaml', 'rubric.md'):
        shutil.copy2(SOURCE / 'evals' / name, target / 'evals' / name)
    shutil.copytree(SOURCE / 'evals/fixtures', target / 'evals/fixtures', ignore=shutil.ignore_patterns('__pycache__', 'node_modules', 'test-results'))
    archived = RESULTS / 'frozen-inputs' / condition
    shutil.copytree(target, archived)
    for name in ('SKILL', 'CONTRIBUTING'):
        (archived / (name + '.md')).rename(archived / (name + '.snapshot.md'))
    (RESULTS / condition).mkdir()
for name in ('codex', 'skills-disable.toml-value.txt'):
    shutil.copy2(bin_dir / name, RESULTS / 'execution' / ('codex-wrapper.snapshot.py' if name == 'codex' else name))
hashes = {str(p.relative_to(RESULTS / 'frozen-inputs')): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in (RESULTS / 'frozen-inputs').rglob('*') if p.is_file()}
(RESULTS / 'input-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
plan.update(status='running', shards=[[case] for case in plan['cases']], generation_timeout_seconds=900,
            isolation={'disabledGlobalSkillPaths': len(disabled), 'project_doc_max_bytes': 0,
                       'pluginsAppsMultiAgent': 'disabled by existing repository runner'},
            qualityCriterion='Same updated rubric for both conditions; function and caller quality is distinct from behavior tests')
plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
shutil.copy2(previous_results / 'execution/run_suite.py', RESULTS / 'execution/run_suite.py')
print(json.dumps({'frozenFiles': len(hashes), 'disabledSkillPaths': len(disabled), 'stage': str(stage)}, ensure_ascii=False))
