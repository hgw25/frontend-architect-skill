from pathlib import Path
import datetime,hashlib,json,shutil,subprocess,tempfile,tomllib
R=Path(__file__).resolve().parents[1];S=R.parents[2]
P=json.loads((R/'plan.json').read_text());stage=Path(tempfile.mkdtemp(prefix='frontend-confirmed-issues-'))
(stage/'bin').mkdir()
old=S/'evals/results/2026-10-16-full-suite-54/execution'
shutil.copy2(old/'codex-wrapper.snapshot.py',stage/'bin/codex');(stage/'bin/codex').chmod(0o755)
config=tomllib.loads((old/'skills-disable.toml-value.txt').read_text())['skills']['config']
disabled={row['path']for row in config}
for root in (Path.home()/'.codex/skills',Path.home()/'.agents/skills'):
    disabled.update(str(p.parent)for p in root.rglob('SKILL.md'))
(stage/'bin/skills-disable.toml-value.txt').write_text('skills.config=['+','.join('{path='+json.dumps(path)+',enabled=false}'for path in sorted(disabled))+']')
for condition in ('previous','candidate'):
    root=stage/condition;root.mkdir();guide=R/'before'if condition=='previous'else S
    for name in ('SKILL','CONTRIBUTING'):
        shutil.copy2(guide/(name+('.snapshot.md'if condition=='previous'else'.md')),root/(name+'.md'))
    shutil.copytree(guide/'references',root/'references')
    shutil.copytree(S/'scripts',root/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
    (root/'evals').mkdir()
    for name in ('cases.yaml','rubric.md'):shutil.copy2(S/'evals'/name,root/'evals'/name)
    shutil.copytree(S/'evals/fixtures',root/'evals/fixtures',ignore=shutil.ignore_patterns('node_modules','.git','__pycache__','dist','test-results'))
    archive=R/'frozen-inputs'/condition;shutil.copytree(root,archive)
    for name in ('SKILL','CONTRIBUTING'):(archive/(name+'.md')).rename(archive/(name+'.snapshot.md'))
hashes={str(p.relative_to(R/'frozen-inputs')):hashlib.sha256(p.read_bytes()).hexdigest()for p in (R/'frozen-inputs').rglob('*')if p.is_file()}
(R/'input-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
P.update(status='running',stage=str(stage),model='gpt-5.6-sol',reasoning_effort='high',generationTimeout=1500,scoringTimeout=900,
         concurrency=2,auditVersion=9,routingPolicy=3,guideLines={'previous':len((R/'before/SKILL.snapshot.md').read_text().splitlines()),'candidate':len((S/'SKILL.md').read_text().splitlines())},
         captureRetry='One separate capture recovery for an invalid sample, never a quality-failure replacement',startedGenerationAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
(R/'plan.json').write_text(json.dumps(P,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'stage':str(stage),'frozenFiles':len(hashes),'cases':P['protocol']['targetedCases'],'guideLines':P['guideLines']}))
