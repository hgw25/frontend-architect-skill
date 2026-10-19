from pathlib import Path
import json,shutil,tempfile,subprocess
root=Path('/Users/heguangwei/project/skills/frontend-architect-skill')
base=root/'evals/results/2026-10-19-evaluation-acceptance'
for case,oracle in [('autonomous-live-board','board-focus.spec.mjs'),('autonomous-live-invites','invites-behavior.spec.mjs')]:
 data=json.loads((base/'fresh'/case/'manifest.json').read_text())['cases'][0]
 folder=base/'fresh'/case/case/'candidate'
 snapshot=json.loads((folder/'project-final.json').read_text())
 with tempfile.TemporaryDirectory(prefix='frontend-architect-host-continuity-')as temporary:
  work=Path(temporary)
  for name,entry in snapshot['files'].items():
   if entry['text']is None:raise RuntimeError('Binary snapshot needs an explicit reconstruction')
   path=work/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(entry['text'])
  (work/'node_modules').symlink_to(Path(data['workspace'])/'node_modules',target_is_directory=True)
  shutil.copy2(root/'evals/oracles'/oracle,work/'tests'/oracle)
  result=subprocess.run(['npx','playwright','test',oracle],cwd=work,capture_output=True,text=True,timeout=120)
  (base/'execution'/f'{case}-hidden.log').write_text(result.stdout+result.stderr)
  if(work/'test-results/results.json').exists():shutil.copy2(work/'test-results/results.json',base/'execution'/f'{case}-hidden.json')
  print(case,result.returncode,flush=True)
