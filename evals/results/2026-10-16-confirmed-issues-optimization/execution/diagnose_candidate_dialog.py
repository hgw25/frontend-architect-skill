"""Separate the repeated initial restoration defect from the remaining blur gap."""
from pathlib import Path
import difflib,hashlib,json,os,shutil,subprocess,tempfile
R=Path(__file__).resolve().parents[1]
P=json.loads((R/'plan.json').read_text())
D=R/'dialog-diagnostics/candidate-repeat'
D.mkdir(parents=True)
root=R/'dialog-repeat/candidate/accessible-dialog-primitive'
record=json.loads((root/'manifest.json').read_text())['cases'][0]
source=Path(record['workspace'])
work=Path(tempfile.mkdtemp(prefix='frontend-confirmed-dialog-blur-'))
shutil.copytree(source,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','test-results','.cache','.npm-cache','playwright-report'))
(work/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
inputs={str(p.relative_to(work)):hashlib.sha256(p.read_bytes()).hexdigest()for p in work.rglob('*')if p.is_file()and'node_modules'not in p.parts}
checks=[]
def run(name,command,cwd=work):
    result=subprocess.run(command,cwd=cwd,text=True,capture_output=True,timeout=150,env={**os.environ,'CI':'1','NO_COLOR':'1'})
    (D/(name+'.log')).write_text(result.stdout+result.stderr)
    checks.append({'name':name,'command':command,'cwd':str(cwd),'exitCode':result.returncode})
    print(name,result.returncode,flush=True)
run('unchanged-repaired-full-check',['npm','run','check'])
component=work/'src/Dialog.tsx'
before=component.read_text()
needle="    document.addEventListener('focusin', handleFocusIn)"
assert before.count(needle)==1
replacement="""    const handleFocusOut = () => {
      queueMicrotask(() => {
        if (!isTopDialog(content) || content.contains(document.activeElement)) return
        const fallback =
          (layer.lastFocusedInside?.isConnected ? layer.lastFocusedInside : null) ??
          getFocusableElements(content)[0] ??
          content
        focusElement(fallback)
      })
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)"""
after=before.replace(needle,replacement).replace("      document.removeEventListener('focusin', handleFocusIn)","      document.removeEventListener('focusin', handleFocusIn)\n      document.removeEventListener('focusout', handleFocusOut)")
component.write_text(after)
(D/'focusout-only.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/Dialog.tsx',tofile='src/Dialog.tsx')))
run('focusout-fix-same-full-check',['npm','run','check'])
initial=Path(tempfile.mkdtemp(prefix='frontend-confirmed-dialog-repeat-initial-'))
shutil.copytree(Path(P['stage'])/'candidate/evals/fixtures/accessible-dialog-browser',initial,dirs_exist_ok=True)
subprocess.run(['git','init','--quiet'],cwd=initial,check=True)
patch=root/'accessible-dialog-primitive/candidate/attempts/0/changes.diff'
subprocess.run(['git','apply','--binary',str(patch.resolve())],cwd=initial,check=True)
(initial/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
run('initial-source-development-focus',['node','scripts/check-dialog-contract.mjs'],initial)
main=initial/'src/main.tsx'
original=main.read_text()
assert '<StrictMode>'in original and '</StrictMode>'in original
changed=original.replace('<StrictMode>','<>').replace('</StrictMode>','</>')
main.write_text(changed)
(D/'strict-mode-only-diagnostic.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),changed.splitlines(True),fromfile='src/main.tsx',tofile='src/main.tsx')))
run('initial-source-without-strict-replay',['node','scripts/check-dialog-contract.mjs'],initial)
(D/'results.json').write_text(json.dumps({'originalWorkspace':str(source),'repairedCopy':str(work),'initialReconstruction':str(initial),'inputHashes':inputs,'checks':checks,
    'scope':'Original source and tests unchanged. Focusout-only component repair is diagnostic with original tests; it does not reclassify original invalid capture. StrictMode removal only isolates initial effect replay; it is not a proposed product fix.'},indent=2)+'\n')
