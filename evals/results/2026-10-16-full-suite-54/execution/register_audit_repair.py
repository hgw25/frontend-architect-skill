"""Register a narrow auditor repair; retain raw v7 captures and defer obsolete scoring."""
from pathlib import Path
import datetime,hashlib,json,os,shutil,tempfile
R=Path(__file__).resolve().parents[1];P=json.loads((R/'run-plan.json').read_text());S=Path(P['sourceRoot']);OLD=Path(P['stage'])
NEW=Path(tempfile.mkdtemp(prefix='frontend-full54-audit8-'))
for c in ('previous','candidate'):
    shutil.copytree(R/'frozen-inputs'/c,NEW/c)
    for n in ('SKILL','CONTRIBUTING'):(NEW/c/(n+'.snapshot.md')).rename(NEW/c/(n+'.md'))
    shutil.copy2(S/'scripts/run_behavior_evals.py',NEW/c/'scripts/run_behavior_evals.py')
    shutil.copy2(S/'scripts/test_run_behavior_evals.py',NEW/c/'scripts/test_run_behavior_evals.py')
shutil.copytree(OLD/'bin',NEW/'bin')
archive=R/'audit-v8-tools';archive.mkdir()
for n in ('run_behavior_evals.py','test_run_behavior_evals.py'):
    shutil.copy2(S/'scripts'/n,archive/n)
protocol={'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'oldAuditRevision':7,'newAuditRevision':8,'trigger':'Fresh candidate Dialog successful exact git diff --check && git status --short && git diff --name-only -- .frontend-architect is metadata-only but rejected by v7','change':'In &&-only chains with exit 0, recognize an exact git diff --check segment as a successful no-content check. Do not credit it as an instruction read. Failing checks, patch flags, content reads, alternate separators and ordinary git diff remain rejected.','tests':{'passed':80,'added':3,'log':'execution/tool-tests-audit-v8.log'},'sourceGuidanceChanged':False,'capturePlan':'Keep v7 generator, prompt, fixture, guide, model and limits unchanged for all 108 initial captures. Preserve every v7 manifest and partial v7 score.','gradingPlan':'Defer future obsolete v7 scoring dispatches with explicit exit 75. After all captures, copy raw evidence into audit-repair/, uniformly recompute v8 audits and grade both conditions afresh with the same frozen scorer/rubric. No score cache migration or pass-based selection.','canonicalStage':str(NEW),'knownStillInvalid':'Previous Dialog git status --short && git diff -- .frontend-architect remains unknown; do not extend the repair to a content-producing diff','followupPlan':'Choose bounded recovery/repeat tasks from uniform v8 results; preserve first v7/v8 records and every follow-up cohort','toolHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.iterdir()}}
(R/'audit-repair-protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2)+'\n')
# Atomic replacement affects only future scorer process starts; any already-running
# v7 judge finishes with its original loaded code and remains archived.
for c in ('previous','candidate'):
    target=OLD/c/'scripts/score_behavior_evals.py'
    archived=R/'execution'/('deferred-'+c+'-original-scorer.snapshot.py');shutil.copy2(target,archived)
    tmp=target.with_suffix('.deferred.tmp')
    # Exit 75 is explicit deferral, distinguishable from a valid completed score.
    tmp.write_text("import sys\nprint('GRADING_DEFERRED: audit revision 8 registered; canonical scoring follows all captures', flush=True)\nsys.exit(75)\n")
    os.replace(tmp,target)
P['followupStage']=str(NEW);P['canonicalResultsRoot']='audit-repair';P['canonicalAuditRevision']=8;P['toolRepairProtocol']='audit-repair-protocol.json';P['scoringStatus']='v7 partially completed, future v7 grading deferred; all raw captures will receive uniform v8 audit and fresh grading'
(R/'run-plan.json').write_text(json.dumps(P,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'canonicalStage':str(NEW),'deferredV7Scoring':True,'guidanceChanged':False}))
