from pathlib import Path
import hashlib,json,shutil,tempfile
R=Path(__file__).resolve().parents[1]/'dialog-diagnostics'
R.mkdir(exist_ok=True)
root=Path(tempfile.mkdtemp(prefix='frontend-dialog-diagnostics-'))
inputs={}
for condition,suffix in [('previous276','i88_jx0x'),('initial150','qfg_3_9x')]:
    source=Path('/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-'+suffix)
    target=root/condition
    shutil.copytree(source,target,ignore=shutil.ignore_patterns('node_modules','.git','references','SKILL.md','CONTRIBUTING.md','test-results','playwright-report'))
    (target/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
    archive=R/'inputs'/condition
    shutil.copytree(target,archive,ignore=shutil.ignore_patterns('node_modules'))
    inputs[condition]={'original':str(source),'diagnosticCopy':str(target),'fileHashes':{str(p.relative_to(archive)):hashlib.sha256(p.read_bytes()).hexdigest() for p in archive.rglob('*') if p.is_file()}}
(R/'plan.json').write_text(json.dumps({'status':'running','scope':'Historical outputs only; no edits to original captures or frozen 54-case comparison','root':str(root),'inputs':inputs,'hypotheses':['previous fixture script initialization failure causes missing trigger','Playwright JSX transform causes SSR React child object error','outside pointer default focus overwrites cleanup restoration'],'method':'Reproduce unchanged output; perturb one causal variable in diagnostic copy; retain before and after events/checks. A diagnostic fix does not change original verdict.'},indent=2)+'\n')
print(root)
