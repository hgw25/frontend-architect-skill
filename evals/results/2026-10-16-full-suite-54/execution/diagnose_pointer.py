from pathlib import Path
import difflib,json,os,subprocess
R=Path(__file__).resolve().parents[1]/'dialog-diagnostics'
W=Path(json.loads((R/'plan.json').read_text())['inputs']['initial150']['diagnosticCopy'])
checks=[]
def run(name,args):
 p=subprocess.run(args,cwd=W,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'})
 (R/(name+'.log')).write_text(p.stdout+p.stderr);checks.append({'name':name,'command':args,'exit_code':p.returncode});print(name,p.returncode,flush=True)
run('pointer-original-browser',['npm','run','test:browser'])
p=W/'src/dialog-layer.ts'; before=p.read_text()
needle='if (!event.defaultPrevented) onDismiss()'
assert before.count(needle)==1
after=before.replace(needle,'if (!event.defaultPrevented) {\n      event.preventDefault()\n      onDismiss()\n    }')
p.write_text(after)
(R/'pointer-focused-diagnostic.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/dialog-layer.ts',tofile='src/dialog-layer.ts')))
run('pointer-focused-fix-check',['npm','run','check'])
(R/'pointer-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
