"""Check new acceptance contracts against known failing and repaired submissions."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile
R=Path(__file__).resolve().parents[1];S=R.parents[2];OLD=S/'evals/results/2026-10-16-full-suite-54'
D=R/'regression-controls';D.mkdir()
dialog=json.loads((OLD/'dialog-diagnostics/repeat151/results.json').read_text())
vue_initial=next(record for p in (OLD/'audit-repair/candidate').glob('shard-*/batch-*/manifest.json')
                 for record in json.loads(p.read_text())['cases']if record['id']=='vue-search-url-i18n')
vue_repeat=json.loads((OLD/'repeats/candidate/vue-search-url-i18n/manifest.json').read_text())['cases'][0]
controls=[('bad-dialog',Path(dialog['originalWorkspace']),'accessible-dialog-browser','scripts/check-dialog-contract.mjs',['node','scripts/check-dialog-contract.mjs'],False),
          ('fixed-dialog',Path(dialog['diagnosticCopy']),'accessible-dialog-browser','scripts/check-dialog-contract.mjs',['node','scripts/check-dialog-contract.mjs'],True),
          ('missing-pending-vue',Path(vue_initial['workspace']),'vue-search-state-i18n','src/search-contract.test.ts',['npx','vitest','run','src/search-contract.test.ts'],False),
          ('pending-vue',Path(vue_repeat['workspace']),'vue-search-state-i18n','src/search-contract.test.ts',['npx','vitest','run','src/search-contract.test.ts'],True)]
rows=[]
for name,original,fixture,contract,command,expected in controls:
    work=Path(tempfile.mkdtemp(prefix='frontend-regression-control-'))
    shutil.copytree(original,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','.cache','.npm-cache','test-results','playwright-report'))
    (work/'node_modules').symlink_to(original/'node_modules',target_is_directory=True)
    target=work/contract;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(S/'evals/fixtures'/fixture/contract,target)
    inputs={str(p.relative_to(work)):hashlib.sha256(p.read_bytes()).hexdigest()for p in work.rglob('*')if p.is_file()and'node_modules'not in p.parts}
    done=subprocess.run(command,cwd=work,text=True,capture_output=True,timeout=90,env={**os.environ,'CI':'1','NO_COLOR':'1'})
    (D/(name+'.log')).write_text(done.stdout+done.stderr)
    rows.append({'id':name,'source':str(original),'copy':str(work),'command':command,'exitCode':done.returncode,'expectedPass':expected,'matched':(done.returncode==0)==expected,'inputs':inputs})
    print(name,done.returncode,'expected pass',expected,flush=True)
(D/'results.json').write_text(json.dumps({'scope':'Historical-submission controls, not fresh guide comparisons. Unchanged new contract in separate copies; no original artifact modified.','records':rows},indent=2)+'\n')
raise SystemExit(not all(row['matched']for row in rows))
