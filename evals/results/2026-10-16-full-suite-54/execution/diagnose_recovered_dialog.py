"""Reproduce the new old-guide Dialog recovery failure without changing its submission."""
from pathlib import Path
import difflib,hashlib,json,os,shutil,subprocess,tempfile
RESULTS=Path(__file__).resolve().parents[1]
DIAG=RESULTS/'dialog-diagnostics/recovery276';DIAG.mkdir()
source=Path('/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup')
work=Path(tempfile.mkdtemp(prefix='frontend-dialog-recovery-diagnostic-'))
shutil.copytree(source,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','dist','test-results','playwright-report'))
(work/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
archive=DIAG/'inputs';shutil.copytree(work,archive,ignore=shutil.ignore_patterns('node_modules'))
hashes={str(p.relative_to(archive)):hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.rglob('*')if p.is_file()}
checks=[]
def run(name,command):
    done=subprocess.run(command,cwd=work,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=120)
    (DIAG/(name+'.log')).write_text(done.stdout+done.stderr)
    checks.append({'name':name,'command':command,'exitCode':done.returncode});print(name,done.returncode,flush=True)
run('original-four-browser-checks',['npx','playwright','test','tests/dialog.spec.ts'])
probe='''import {expect,test} from '@playwright/test'
import {writeFileSync} from 'node:fs'
declare global { interface Window { diagnosticTrace: object[] } }
for (const cancelDefault of [false,true]) {
  test('outside pointer trace '+cancelDefault,async({page})=>{
    await page.goto('/')
    const trigger=page.getByRole('button',{name:'Edit profile'})
    await trigger.click()
    const dialog=page.getByRole('dialog',{name:'Edit profile'})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Name')).toBeFocused()
    await page.evaluate((cancel)=>{
      const content=document.querySelector('[role="dialog"]')!
      const label=(element:Element|null)=>element?.tagName+' '+element?.textContent?.trim().slice(0,40)
      window.diagnosticTrace=[]
      const original=HTMLElement.prototype.focus
      HTMLElement.prototype.focus=function(this:HTMLElement,options?:FocusOptions){
        window.diagnosticTrace.push({event:'focus-call',target:label(this)})
        original.call(this,options)
      }
      for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','focusin','focusout']){
        document.addEventListener(type,event=>window.diagnosticTrace.push({event:type,
          target:label(event.target instanceof Element?event.target:null),active:label(document.activeElement)}),true)
      }
      if(cancel)document.addEventListener('pointerdown',event=>{
        if(!content.contains(event.target as Node))event.preventDefault()
      },true)
    },cancelDefault)
    await page.mouse.click(1,1)
    await expect(dialog).toBeHidden()
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    const observation=await page.evaluate(()=>({activeTag:document.activeElement?.tagName,
      activeText:document.activeElement?.textContent?.trim().slice(0,50),trace:window.diagnosticTrace}))
    writeFileSync('trace-'+cancelDefault+'.json',JSON.stringify(observation,null,2))
  })
}
'''
(work/'tests/pointer-trace.diagnostic.spec.ts').write_text(probe);(DIAG/'pointer-trace.snapshot.ts').write_text(probe)
run('pointer-traces',['npx','playwright','test','tests/pointer-trace.diagnostic.spec.ts'])
for value in ['false','true']:
    shutil.copy2(work/('trace-'+value+'.json'),DIAG/('trace-'+value+'.json'))
p=work/'src/Dialog.tsx';before=p.read_text();needle="if (event.defaultPrevented) return\n        context.requestOpenChange(false, 'outside-pointer')";assert before.count(needle)==1
after=before.replace(needle,"if (event.defaultPrevented) return\n        event.preventDefault()\n        context.requestOpenChange(false, 'outside-pointer')");p.write_text(after)
(DIAG/'focused-diagnostic.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/Dialog.tsx',tofile='src/Dialog.tsx')))
run('focused-fix-same-four-checks',['npx','playwright','test','tests/dialog.spec.ts'])
(DIAG/'results.json').write_text(json.dumps({'originalWorkspace':str(source),'diagnosticCopy':str(work),'inputHashes':hashes,'checks':checks,'scope':'Original submission untouched; only diagnostic copy source is changed after unchanged-source replay and two event traces. Same original four browser assertions before/after; no full release/matrix claim.'},indent=2)+'\n')
