"""Retain the failed broad focusout probe, then scope it to its active owner."""
from pathlib import Path
import difflib,hashlib,json,os,subprocess
R=Path(__file__).resolve().parents[1]
D=R/'dialog-diagnostics/candidate-repeat'
results=json.loads((D/'results.json').read_text())
work=Path(results['repairedCopy'])
file=work/'src/Dialog.tsx'
before=file.read_text()
needle='    const handleFocusOut = () => {\n      queueMicrotask(() => {'
assert before.count(needle)==1
replacement="""    const handleFocusOut = (event: FocusEvent) => {
      if (!isTopDialog(content) || !(event.target instanceof Node) || !content.contains(event.target)) return
      queueMicrotask(() => {"""
after=before.replace(needle,replacement)
file.write_text(after)
(D/'scope-focusout-owner.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/Dialog.tsx',tofile='src/Dialog.tsx')))
result=subprocess.run(['npm','run','check'],cwd=work,text=True,capture_output=True,timeout=150,env={**os.environ,'CI':'1','NO_COLOR':'1'})
(D/'scoped-focusout-same-full-check.log').write_text(result.stdout+result.stderr)
results['checks'].append({'name':'scoped-focusout-same-full-check','command':['npm','run','check'],'cwd':str(work),'exitCode':result.returncode,
                          'beforeComponentSha256':hashlib.sha256(before.encode()).hexdigest(),'afterComponentSha256':hashlib.sha256(after.encode()).hexdigest()})
results['scope']+=' Broad focusout probe fixed blur but introduced nested return-focus failure; subsequent probe scopes capture to the active owner at event time and its own descendants. Both failed probes and any pass remain separate; no original artifact changed.'
(D/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print('scoped-focusout-same-full-check',result.returncode)
