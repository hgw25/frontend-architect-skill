from pathlib import Path
import difflib,hashlib,json,os,shutil,subprocess
R=Path(__file__).resolve().parents[1]/'dialog-diagnostics'; p=R/'plan.json'; plan=json.loads(p.read_text())
source=Path('/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qoxj0g88')
W=Path(plan['root'])/'timedout276'
shutil.copytree(source,W,ignore=shutil.ignore_patterns('node_modules','.git','references','SKILL.md','CONTRIBUTING.md','test-results','playwright-report'))
(W/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
archive=R/'inputs/timedout276';shutil.copytree(W,archive,ignore=shutil.ignore_patterns('node_modules'))
plan['inputs']['timedout276']={'original':str(source),'diagnosticCopy':str(W),'fileHashes':{str(f.relative_to(archive)):hashlib.sha256(f.read_bytes()).hexdigest() for f in archive.rglob('*') if f.is_file()}}
p.write_text(json.dumps(plan,indent=2)+'\n')
checks=[]
def run(name,args):
 done=subprocess.run(args,cwd=W,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'});(R/(name+'.log')).write_text(done.stdout+done.stderr);checks.append({'name':name,'command':args,'exit_code':done.returncode});print(name,done.returncode,flush=True)
run('timeout-original-browser',['npm','run','test:browser'])
f=W/'src/hydration-main.tsx';before=f.read_text();after=before.replace('<Dialog.Content aria-label="Hydrated dialog" />','<Dialog.Content aria-label="Hydrated dialog">Hydrated content</Dialog.Content>');assert before!=after;f.write_text(after)
(R/'timeout-consumer-content.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='src/hydration-main.tsx',tofile='src/hydration-main.tsx')))
run('timeout-consumer-content-browser',['npm','run','test:browser'])
(R/'timeout-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
