from pathlib import Path
import datetime, hashlib, json, platform, shutil, subprocess, tempfile, tomllib
import yaml
R=Path(__file__).resolve().parents[1]
S=R.parents[2]
O=S/'evals/results/2026-10-15-progressive-disclosure-optimization'
stage=Path(tempfile.mkdtemp(prefix='frontend-full54-'))
ids=[c['id'] for c in yaml.safe_load((S/'evals/cases.yaml').read_text())['cases']]
assert len(ids)==54 and len(set(ids))==54
# Schedule costly executable tasks early without overlapping Dialog pairs.
priority=['accessible-dialog-primitive','settled-interaction-journey-executable','vite-feature-flags-plugin','optimistic-profile-update','vue-search-url-i18n']
order=priority+[i for i in ids if i not in priority]
shards=[order[i::3] for i in range(3)]
(stage/'bin').mkdir()
shutil.copy2(O/'execution/codex-wrapper.snapshot.py',stage/'bin/codex')
(stage/'bin/codex').chmod(0o755)
config=tomllib.loads((O/'execution/skills-disable.toml-value.txt').read_text())['skills']['config']
disabled={x['path'] for x in config}
for root in (Path.home()/'.codex/skills',Path.home()/'.agents/skills'):
    disabled.update(str(p.parent) for p in root.rglob('SKILL.md'))
value='skills.config=['+','.join('{path='+json.dumps(p)+',enabled=false}' for p in sorted(disabled))+']'
(stage/'bin/skills-disable.toml-value.txt').write_text(value)
for condition in ('previous','candidate'):
    target=stage/condition; target.mkdir()
    guide=O/'frozen-inputs/previous' if condition=='previous' else S
    for name in ('SKILL','CONTRIBUTING'):
        source=guide/(name+('.snapshot.md' if condition=='previous' else '.md'))
        shutil.copy2(source,target/(name+'.md'))
    shutil.copytree(guide/'references',target/'references')
    shutil.copytree(S/'scripts',target/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
    (target/'evals').mkdir()
    for name in ('cases.yaml','rubric.md'):
        shutil.copy2(S/'evals'/name,target/'evals'/name)
    shutil.copytree(S/'evals/fixtures',target/'evals/fixtures',ignore=shutil.ignore_patterns('__pycache__','node_modules','test-results','dist','.git'))
    archive=R/'frozen-inputs'/condition
    shutil.copytree(target,archive)
    for name in ('SKILL','CONTRIBUTING'):
        (archive/(name+'.md')).rename(archive/(name+'.snapshot.md'))
    (R/condition).mkdir()
for name in ('codex','skills-disable.toml-value.txt'):
    shutil.copy2(stage/'bin'/name,R/'execution'/('codex-wrapper.snapshot.py' if name=='codex' else name))
hashes={str(p.relative_to(R/'frozen-inputs')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'frozen-inputs').rglob('*') if p.is_file()}
(R/'input-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
installed=Path.home()/'.codex/skills/frontend-architect'
runtime=['SKILL.md']+[str(p.relative_to(S)) for p in (S/'references').rglob('*') if p.is_file()]
installed_checks={p:{'source':hashlib.sha256((S/p).read_bytes()).hexdigest(),'installed':hashlib.sha256((installed/p).read_bytes()).hexdigest()} for p in runtime}
assert all(v['source']==v['installed'] for v in installed_checks.values())
(R/'installed-runtime-check.json').write_text(json.dumps(installed_checks,indent=2)+'\n')
plan={'status':'running','started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRoot':str(S),'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=S,text=True).strip(),'stage':str(stage),'model':'gpt-5.6-sol','reasoning_effort':'high','generation_timeout_seconds':1500,'scoring_timeout_seconds':900,'concurrency':3,'cases':ids,'shards':shards,'comparison':'Previous 276-line installed-matched snapshot vs current installed-matched 151-line snapshot; both explicitly invoked as candidate mode, not no-skill baseline','environment':{'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'codex':subprocess.check_output(['/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex','--version'],text=True).strip(),'disabledGlobalSkillPaths':len(disabled),'project_doc_max_bytes':0},'protocol':{'capture':'108 fresh generations, continue after a failed case; retain immutable first attempts','grading':'Independent quality and one-vote failure contexts with frozen uniform tools/rubric; no must_observe supplied to graders','capture_retry':'One new attempt per invalid capture, retained separately; never retry valid quality failure to replace it','regression_repeat':'One additional fresh pair for candidate verdict downgrade/new failure or normalized score drop >= 1.0; Dialog repeated regardless due prior high variance','claims':'A repeated or unresolved deficit remains reported; no pass by majority or hidden harness repair','browser_ports':'Dialog pairs sequential in shard 1; interaction fixture selects free ephemeral port; generated configs inspected if browser failures occur','guide_immutable':'No guide/fixture/rubric changes during comparison; diagnostic copies separate'}}
(R/'run-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
(R/'preflight-git-status.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=S,text=True))
print(json.dumps({'stage':str(stage),'frozenFiles':len(hashes),'cases':len(ids),'runtimeMatchesInstalled':True}))
