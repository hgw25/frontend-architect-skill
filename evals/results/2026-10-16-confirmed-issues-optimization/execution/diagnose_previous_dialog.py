"""Separate the old-guide repair outcome, generated locator error, and initial hypothesis."""
from pathlib import Path
import difflib,hashlib,json,os,shutil,subprocess,tempfile
R=Path(__file__).resolve().parents[1];P=json.loads((R/'plan.json').read_text());D=R/'dialog-diagnostics/previous-initial';D.mkdir(parents=True)
root=R/'initial/previous/accessible-dialog-primitive';record=json.loads((root/'manifest.json').read_text())['cases'][0]
source=Path(record['workspace']);work=Path(tempfile.mkdtemp(prefix='frontend-confirmed-dialog-harness-'))
shutil.copytree(source,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','test-results','.cache','.npm-cache','playwright-report'))
(work/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
inputs={str(p.relative_to(work)):hashlib.sha256(p.read_bytes()).hexdigest()for p in work.rglob('*')if p.is_file()and'node_modules'not in p.parts}
checks=[]
def run(name,command,cwd=work):
    done=subprocess.run(command,cwd=cwd,text=True,capture_output=True,timeout=150,env={**os.environ,'CI':'1','NO_COLOR':'1'})
    (D/(name+'.log')).write_text(done.stdout+done.stderr);checks.append({'name':name,'command':command,'cwd':str(cwd),'exitCode':done.returncode});print(name,done.returncode,flush=True)
run('unchanged-repaired-full-check',['npm','run','check'])
test=work/'tests/dialog.spec.ts';before=test.read_text()
needle="  await expect(parent).toHaveAttribute('inert', '')"
assert before.count(needle)==1
after=before.replace(needle,"  await expect(page.getByRole('dialog', { name: 'Edit profile', includeHidden: true })).toHaveAttribute('inert', '')")
test.write_text(after)
(D/'locator-only.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='tests/dialog.spec.ts',tofile='tests/dialog.spec.ts')))
run('locator-correction-same-full-check',['npm','run','check'])
initial=Path(tempfile.mkdtemp(prefix='frontend-confirmed-dialog-initial-'))
shutil.copytree(Path(P['stage'])/'previous/evals/fixtures/accessible-dialog-browser',initial,dirs_exist_ok=True)
subprocess.run(['git','init','--quiet'],cwd=initial,check=True)
patch=root/'accessible-dialog-primitive/candidate/attempts/0/changes.diff'
subprocess.run(['git','apply','--binary',str(patch.resolve())],cwd=initial,check=True)
(initial/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
run('initial-source-development-focus',['node','scripts/check-dialog-contract.mjs'],initial)
main=initial/'src/main.tsx';original=main.read_text()
assert '<StrictMode>'in original and '</StrictMode>'in original
changed=original.replace('<StrictMode>','<>').replace('</StrictMode>','</>');main.write_text(changed)
(D/'strict-mode-only-diagnostic.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),changed.splitlines(True),fromfile='src/main.tsx',tofile='src/main.tsx')))
run('initial-source-without-strict-replay',['node','scripts/check-dialog-contract.mjs'],initial)
(D/'results.json').write_text(json.dumps({'originalWorkspace':str(source),'repairedCopy':str(work),'initialReconstruction':str(initial),'inputHashes':inputs,'checks':checks,'scope':'Original capture unchanged. Locator metadata correction preserves inert and all behavior assertions. Initial source reconstructed from its frozen fixture and recorded first diff; only StrictMode wrapper changed for causal probe, no product patch claimed.'},indent=2)+'\n')
