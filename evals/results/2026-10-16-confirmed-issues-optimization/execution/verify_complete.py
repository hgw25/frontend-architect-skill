"""Check study coverage and immutable evidence before local activation."""
from pathlib import Path
import hashlib,json,subprocess,sys
R=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(R/'execution/summarize.py')],check=True)
plan=json.loads((R/'plan.json').read_text())
summary=json.loads((R/'summary.json').read_text())
errors=list(summary['errors'])
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R.parents[2],text=True).strip()
if head!=plan['sourceHead']:errors.append('Source commit changed during study')
isolation=json.loads((R/'execution/isolation-input-hashes.json').read_text())
for name,digest in isolation['files'].items():
    archived=R/'execution'/('codex-wrapper.snapshot.py'if name=='codex'else name)
    for path in (archived,Path(plan['stage'])/'bin'/name,Path(plan['finalStage'])/'bin'/name):
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:errors.append('Isolation launch input changed: '+str(path))
inputs=json.loads((R/'input-hashes.json').read_text())
condition_differences=[]
for name,digest in inputs.items():
    if not name.startswith('candidate/'):continue
    relative=name.removeprefix('candidate/')
    source_relative=relative.replace('.snapshot.md','.md')if '/'not in relative else relative
    current=R.parents[2]/source_relative
    current_digest=hashlib.sha256(current.read_bytes()).hexdigest()if current.is_file()else None
    expected_digest=digest
    if relative=='SKILL.snapshot.md'and plan.get('finalGuideSnapshot'):
        expected_digest=hashlib.sha256((Path(plan['finalGuideSnapshot'])/relative).read_bytes()).hexdigest()
    scoring_fix=plan.get('postCaptureScoringFix',{}).get('sourceChanges',{})
    if source_relative in scoring_fix:expected_digest=scoring_fix[source_relative]['after']
    if current_digest!=expected_digest:
        errors.append('Source input changed since freeze: '+source_relative)
    if inputs.get('previous/'+relative)!=digest:condition_differences.append(relative)
allowed=['SKILL.snapshot.md','references/interface-and-motion.md','references/verification-and-review.md']
if sorted(condition_differences)!=sorted(allowed):errors.append('Unexpected condition differences: '+repr(condition_differences))
final_inputs=json.loads((R/'final-forward/input-hashes.json').read_text())
final_changes=[]
for name,digest in final_inputs.items():
    path=Path(plan['finalGuideSnapshot'])/name
    if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:errors.append('Final frozen input changed: '+name)
    if inputs.get('candidate/'+name)!=digest:final_changes.append(name)
if final_changes!=['SKILL.snapshot.md']:errors.append('Unexpected final refinement inputs: '+repr(final_changes))
fix=plan['postCaptureScoringFix']
for name,digest in final_inputs.items():
    relative=name.replace('.snapshot.md','.md')if '/'not in name else name
    path=Path(fix['stage'])/'candidate'/relative
    expected=fix['sourceChanges'].get(relative,{}).get('after',digest)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:errors.append('Supplementary grading input changed: '+relative)
for name,hashes in fix['sourceChanges'].items():
    path=R/'evidence-extractor-refinement/frozen-source'/name
    if hashlib.sha256(path.read_bytes()).hexdigest()!=hashes['after']:errors.append('Scoring-fix archive changed: '+name)
supplement_path=R/'evidence-extractor-refinement/outcomes.json'
if not supplement_path.exists():errors.append('Complete-evidence supplementary grading unfinished')
else:
    supplement=json.loads(supplement_path.read_text())
    if [r['label']for r in supplement]!=['previous-repeat','final-guide']:errors.append('Unexpected supplementary grade coverage')
    for item in supplement:
        for filename in ('manifest.json',):
            if (Path(item['source'])/filename).read_bytes()!=(Path(item['copy'])/filename).read_bytes():errors.append('Supplementary source capture changed: '+item['label'])
        if not(Path(item['copy'])/'blind-scores/scores.json').exists():errors.append('Missing supplementary grade: '+item['label'])
expected={('initial',condition,name)for condition in ('previous','candidate')for name in plan['protocol']['targetedCases']}
expected|={('dialog-repeat',condition,'accessible-dialog-primitive')for condition in ('previous','candidate')}
expected|={('route-repeat',condition,name)for condition in ('previous','candidate')for name in plan['protocol']['routeRepeat']['cases']}
expected|={('final-forward/main'if name!='accessible-dialog-primitive'else'final-forward/dialog','candidate',name)for name in plan['refinement']['finalForwardCases']}
for item in summary['repeatSelection']:
    if item['case']!='accessible-dialog-primitive':
        expected|={('repeats',condition,item['case'])for condition in item['conditions']}
actual={(r['cohort'],r['condition'],r['id'])for r in summary['records']}
for key in sorted(expected-actual):errors.append('Missing planned sample: '+repr(key))
for row in summary['records']:
    if row['verdict']!='invalid':
        errors.extend(str((row['cohort'],row['condition'],row['id']))+': '+e for e in row['captureErrors'])
    if row['verdict']=='pending':errors.append('Scoring pending: '+row['path'])
    if not 1<=row['generationAttempts']<=2:errors.append('Invalid attempt count: '+row['path'])
    root=R/row['cohort']/row['condition']/row['id']
    for filename in ('capture.log','scoring.log'):
        if '\nEXIT: 'not in (root/filename).read_text():errors.append('Process unfinished: '+str(root/filename))
    manifest=json.loads((root/'manifest.json').read_text())
    if (manifest['model'],manifest['reasoning_effort'])!=(plan['model'],plan['reasoning_effort']):errors.append('Capture settings differ: '+str(root))
    scores=json.loads((root/'blind-scores/scores.json').read_text())
    if (scores['model'],scores['reasoning_effort'])!=(plan['model'],plan['reasoning_effort']):errors.append('Grade settings differ: '+str(root))
    if row['verdict']=='invalid'and row['cohort']!='capture-recovery':
        recovery=('capture-recovery',row['condition'],row['id'])
        cancellation=(row['cohort']in('initial','dialog-repeat')
                      and plan.get('supersededRecovery',{}).get('status')=='cancelled-before-start')
        if recovery not in actual and not(cancellation and row['condition']=='candidate'and row['id']=='accessible-dialog-primitive'):
            errors.append('Missing bounded invalid recovery: '+row['path'])
audit_pairs=[(cohort,condition)for cohort in ('initial','dialog-repeat')for condition in ('previous','candidate')]
audit_pairs.extend((r['cohort'],r['condition'])for r in summary['records']if r['cohort']=='capture-recovery'and r['id']=='accessible-dialog-primitive')
audit_pairs.append(('final-forward/dialog','candidate'))
for cohort,condition in audit_pairs:
    file=R/'delivery-status'/cohort/condition/'evidence.json'
    if not file.exists():errors.append('Missing first-delivery audit: '+str(file));continue
    audit=json.loads(file.read_text())
    if audit['exitCode']!=0:errors.append('First-delivery audit failed: '+str(file))
    for name,digest in audit['sourceHashes'].items():
        source=Path(audit['source'])/name;copied=file.parent/'accessible-dialog-primitive/candidate'/name
        if any(hashlib.sha256(p.read_bytes()).hexdigest()!=digest for p in (source,copied)):
            errors.append('First-delivery evidence changed: '+str(source))
out={'status':'passed'if not errors else'failed','plannedSamples':len(expected),'capturedSamples':len(actual),
     'generationAttempts':summary['generationAttempts'],'frozenInputFiles':len(json.loads((R/'input-hashes.json').read_text())),
     'conditionDifferences':sorted(condition_differences),'currentSourceMatchesEvaluatedInputsAndScoringFix':not any('Source input changed'in e for e in errors),
     'finalFrozenInputFiles':len(final_inputs),'finalRefinementDifferences':final_changes,
     'postCaptureScoringChanges':fix['sourceChanges'],
     'retainedInvalidCaptures':[{'path':r['path'],'errors':r['captureErrors']}for r in summary['records']if r['verdict']=='invalid'],
     'supersededRecovery':plan.get('supersededRecovery'),
     'scope':'Coverage, model settings, raw capture hashes, attempt limits, copied first-delivery evidence, frozen inputs and evaluated guide bytes. Quality failures remain failures.',
     'errors':errors}
(R/'completion-check.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out,ensure_ascii=False));raise SystemExit(bool(errors))
