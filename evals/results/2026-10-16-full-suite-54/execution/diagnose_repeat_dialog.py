"""Isolate the final repeat's real failure without changing its invalid capture."""
from pathlib import Path
import difflib,hashlib,json,os,shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1];DIAG=ROOT/'dialog-diagnostics/repeat151'
if DIAG.exists():raise SystemExit('Refusing to overwrite diagnostic evidence')
DIAG.mkdir()
manifest=json.loads((ROOT/'repeats/candidate/accessible-dialog-primitive/manifest.json').read_text())
source=Path(manifest['cases'][0]['workspace']);work=Path(tempfile.mkdtemp(prefix='frontend-dialog-repeat-diagnostic-'))
shutil.copytree(source,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','dist','test-results','playwright-report','.cache'))
(work/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
archive=DIAG/'inputs';shutil.copytree(work,archive,ignore=shutil.ignore_patterns('node_modules'))
hashes={str(p.relative_to(archive)):hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.rglob('*')if p.is_file()}
checks=[]
def run(name,command):
    done=subprocess.run(command,cwd=work,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=150)
    (DIAG/(name+'.log')).write_text(done.stdout+done.stderr)
    checks.append({'name':name,'command':command,'exitCode':done.returncode});print(name,done.returncode,flush=True)
run('prepare-original-package-artifacts',['npm','run','build:package'])
run('unchanged-full-check',['npm','run','check'])
test_file=work/'tests/dialog.spec.ts';original_tests=test_file.read_text()
probe=(ROOT/'dialog-diagnostics/recovery276/pointer-trace.snapshot.ts').read_text()
probe=probe.replace("import {expect,test} from '@playwright/test'\n",'')
probe=probe.replace("await page.mouse.click(1,1)","await page.locator('.overlay').click({position:{x:4,y:4}})")
# Cancel after React's overlay handler has requested close, before native default.
# Canceling in capture would instead cancel the dismiss handler's own contract.
probe=probe.replace("if(!content.contains(event.target as Node))event.preventDefault()\n      },true)","if(!content.contains(event.target as Node))event.preventDefault()\n      },false)")
(DIAG/'pointer-trace.snapshot.ts').write_text(probe);test_file.write_text(original_tests+'\n'+probe)
run('pointer-traces',['npx','playwright','test','tests/dialog.spec.ts','-g','outside pointer trace'])
for value in ['false','true']:
    path=work/('trace-'+value+'.json')
    if path.exists():shutil.copy2(path,DIAG/path.name)
test_file.write_text(original_tests)
p=work/'src/Dialog.tsx';before=p.read_text();needle="          setOpen(false, { nativeEvent: event.nativeEvent, reason: 'outside-pointer' })"
assert before.count(needle)==1
after=before.replace(needle,"          event.preventDefault()\n"+needle);p.write_text(after)
(DIAG/'focused-diagnostic.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/Dialog.tsx',tofile='src/Dialog.tsx')))
run('focused-fix-same-full-check',['npm','run','check'])
(DIAG/'results.json').write_text(json.dumps({'originalWorkspace':str(source),'diagnosticCopy':str(work),'inputHashes':hashes,'originalTestsUnchanged':test_file.read_text()==original_tests,'checks':checks,'scope':'Original submission and invalid audit untouched. Same original full check before/after one focused source correction in a separate copy. Trace cancels native default after dismiss, not consumer cancellation or assertions. No broad release/matrix proof.'},indent=2)+'\n')
