"""Host checks run after generation, never edit or feed back into a captured delivery."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,tempfile
out=Path(__file__).resolve().parent.parent;root=out.parents[3]
for group_arg in sys.argv[1:]:
 group=Path(group_arg).resolve();m=json.loads((group/'manifest.json').read_text());checks=[]
 if (group/'host-outcome-checks.json').exists():
  print('Retained prior host check:',group.relative_to(out));continue
 for c in m['cases']:
  if c['id'] not in {'autonomous-live-runtime','autonomous-live-invites','autonomous-live-board'}:continue
  src=Path(c['workspace']);work=Path(tempfile.mkdtemp(prefix='judgment-runtime-host-'))
  shutil.copytree(src,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git','.frontend-architect','node_modules','playwright-report','test-results'))
  if c['id']=='autonomous-live-runtime':
   oracle=root/'evals/oracles/methods-runtime.test.mjs';shutil.copy2(oracle,work/'test/host-receipt.test.mjs')
   command=['node','--test','test/host-receipt.test.mjs'];log=group/'host-receipt.log'
  else:
   name='invites-behavior.spec.mjs' if c['id']=='autonomous-live-invites' else 'board-focus.spec.mjs'
   oracle=root/'evals/oracles'/name;shutil.copy2(oracle,work/'tests/host-extra.spec.mjs')
   (work/'node_modules').symlink_to(src/'node_modules',target_is_directory=True)
   command=['npx','playwright','test','tests/host-extra.spec.mjs'];log=group/'host-browser.log'
  result=subprocess.run(command,cwd=work,capture_output=True,text=True,timeout=120,env={**os.environ,'CI':'1','NO_COLOR':'1'})
  log.write_text(result.stdout+result.stderr)
  checks.append({'id':c['id'],'mode':c['mode'],'exit_code':result.returncode,'workspace':str(work),'oracle_sha256':hashlib.sha256(oracle.read_bytes()).hexdigest(),'log':str(log.relative_to(out)),'scope':'Independent hidden consumer boundary check, no code repair or feedback supplied to generator.'})
 (group/'host-outcome-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
 print(group.relative_to(out),checks)
