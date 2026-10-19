from pathlib import Path
import json,shutil,tempfile,subprocess,os,hashlib
root=Path('/Users/heguangwei/project/skills/frontend-architect-skill')
old=root/'evals/results/2026-10-19-autonomous-workflows/judgment-refinement/verified-repeat/autonomous-live-flags/manifest.json'
source=Path(json.loads(old.read_text())['cases'][0]['workspace'])
results=root/'evals/results/2026-10-19-evaluation-acceptance/execution/package-probes-online'
results.mkdir(exist_ok=True)
outcomes=[]
for mutation in ('none','empty-hooks','missing-types'):
 with tempfile.TemporaryDirectory(prefix='frontend-architect-packed-acceptance-') as temporary:
  work=Path(temporary)
  for name in ('package.json','package-lock.json'):shutil.copy2(source/name,work/name)
  for name in ('packages','examples','scripts'):
   shutil.copytree(source/name,work/name,ignore=shutil.ignore_patterns('node_modules'))
  (work/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
  shutil.copy2(root/'evals/fixtures/live-flags/scripts/check-package.mjs',work/'scripts/check-package.mjs')
  if mutation=='empty-hooks':
   (work/'packages/plugin/dist/index.js').write_text('export function featureFlags(){return {name:"broken",resolveId(){return null},load(){return null}}}\n')
  if mutation=='missing-types':
   (work/'packages/plugin/dist/index.d.ts').write_text('export {}\n')
  result=subprocess.run(['node','scripts/check-package.mjs'],cwd=work,env=os.environ,capture_output=True,text=True,timeout=90)
  (results/f'{mutation}.log').write_text(result.stdout+result.stderr)
  outcomes.append({'mutation':mutation,'exit_code':result.returncode,'log':f'{mutation}.log'})
  print(mutation,result.returncode,flush=True)
(results/'results.json').write_text(json.dumps(outcomes,indent=2)+'\n')
