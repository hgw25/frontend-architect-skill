from pathlib import Path
import json,os,shutil,subprocess,tempfile
out=Path(__file__).resolve().parent.parent;root=out.parents[3]
reference=root/'evals/oracles/methods-reference/board/app.mjs'
before=json.loads((out/'before/autonomous-live-board/manifest.json').read_text())['cases'][0]
rows=[]
for label in ['seed','reference','before-delivery']:
 work=Path(tempfile.mkdtemp(prefix='judgment-board-focus-'+label+'-'))
 shutil.copytree(root/'evals/fixtures/live-board',work,dirs_exist_ok=True)
 if label=='reference':shutil.copy2(reference,work/'src/app.mjs')
 if label=='before-delivery':shutil.copy2(Path(before['workspace'])/'src/app.mjs',work/'src/app.mjs')
 (work/'node_modules').symlink_to(Path(before['workspace'])/'node_modules',target_is_directory=True)
 shutil.copy2(root/'evals/oracles/board-focus.spec.mjs',work/'tests/host-focus.spec.mjs')
 result=subprocess.run(['npx','playwright','test','tests/host-focus.spec.mjs'],cwd=work,text=True,capture_output=True,timeout=60,env={**os.environ,'CI':'1','NO_COLOR':'1'})
 (out/'execution'/f'board-focus-{label}.log').write_text(result.stdout+result.stderr)
 rows.append({'label':label,'exit_code':result.returncode,'workspace':str(work),'log':f'execution/board-focus-{label}.log'})
 print(label,result.returncode,flush=True)
(out/'execution/board-focus-calibration.json').write_text(json.dumps(rows,indent=2)+'\n')
assert [r['exit_code'] for r in rows]==[1,0,1],rows
