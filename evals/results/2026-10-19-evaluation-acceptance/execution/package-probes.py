from pathlib import Path
import json,shutil,tempfile,subprocess,os,hashlib
root=Path(__file__).resolve().parents[4]
source=json.loads((Path(__file__).resolve().parent/'package-probes-source.snapshot.json').read_text())['files']
results=Path(__file__).resolve().parent/'package-probes-replay'
results.mkdir(exist_ok=True)
outcomes=[]
for mutation in ('none','empty-hooks','missing-types'):
 with tempfile.TemporaryDirectory(prefix='frontend-architect-packed-acceptance-') as temporary:
  work=Path(temporary)
  for name,entry in source.items():
   content=entry['text'].encode()
   if hashlib.sha256(content).hexdigest()!=entry['sha256']:raise RuntimeError('Probe input changed: '+name)
   path=work/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
  subprocess.run(['npm','ci'],cwd=work,check=True,capture_output=True,text=True)
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
