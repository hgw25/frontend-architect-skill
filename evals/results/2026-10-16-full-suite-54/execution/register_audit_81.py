"""Prove old grader inputs unchanged before using a compatible project-diff audit fix."""
from pathlib import Path
import datetime,hashlib,json,shutil,sys,tempfile
RESULTS=Path(__file__).resolve().parents[1]
PLAN=json.loads((RESULTS/'run-plan.json').read_text())
SOURCE=Path(PLAN['sourceRoot'])
sys.path.insert(0,str(SOURCE/'scripts'))
import run_behavior_evals as repaired
checks=[];changes=[]
for phase in ('audit-repair','capture-recovery'):
    for condition in ('previous','candidate'):
        pattern='shard-*/batch-*/manifest.json' if phase=='audit-repair' else '*/manifest.json'
        for path in sorted((RESULTS/phase/condition).glob(pattern)):
            for record in json.loads(path.read_text())['cases']:
                events=(path.parent/record['id']/record['mode']/'events.jsonl').read_text()
                assert hashlib.sha256(events.encode()).hexdigest()==record['events_sha256']
                updated=repaired.analyze_reference_reads(events,Path(record['workspace']))
                row={'phase':phase,'condition':condition,'id':record['id'],'sameAuditObject':updated==record['reference_routing']}
                checks.append(row)
                if not row['sameAuditObject']:changes.append({**row,'before':record['reference_routing'],'after':updated})
initial=[c for c in checks if c['phase']=='audit-repair']
assert len(initial)==108 and all(c['sameAuditObject']for c in initial)
assert all(c['phase']=='capture-recovery'and c['id']=='accessible-dialog-primitive'and c['condition']=='previous'for c in changes)
# Neither generation prompts nor either grading implementation, data or schemas change.
assert (SOURCE/'scripts/score_behavior_evals.py').read_bytes()==(RESULTS/'frozen-inputs/candidate/scripts/score_behavior_evals.py').read_bytes()
for name in ('cases.yaml','rubric.md'):
    assert (SOURCE/'evals'/name).read_bytes()==(RESULTS/'frozen-inputs/candidate/evals'/name).read_bytes()
OLD=Path(PLAN['followupStage']);NEW=Path(tempfile.mkdtemp(prefix='frontend-full54-audit81-'))
shutil.copytree(OLD,NEW,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__'))
for condition in ('previous','candidate'):
    for name in ('run_behavior_evals.py','test_run_behavior_evals.py'):
        shutil.copy2(SOURCE/'scripts'/name,NEW/condition/'scripts'/name)
archive=RESULTS/'audit-v8.1-tools';archive.mkdir()
for name in ('run_behavior_evals.py','test_run_behavior_evals.py'):shutil.copy2(SOURCE/'scripts'/name,archive/name)
protocol={'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'implementation':'8.1','auditDataSchema':8,'trigger':'Recovery old Dialog uses exact git diff -- . :(exclude).frontend-architect, which exposes only project changes','change':'Recognize only the exact exclusion at captured workspace root; no guidance-read credit, no other path/options/compound/cwd exception','tests':{'passed':83,'added':3,'log':'execution/tool-tests-audit-v8.1.log'},'equivalenceProof':checks,'changedRecoveryAudits':changes,'initialAuditsUnchanged':108,'initialGraderInputsUnchanged':True,'scorerRubricCasesUnchanged':True,'policy':'Keep all initial grades and original invalid recovery intact. Only the newly recognizable recovery gets its first independent score in a separate audited copy; no cache migration, failure-rule/threshold change or best-score selection. Its known failed host check must remain a failure.','previousStage':str(OLD),'newStage':str(NEW),'toolHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.iterdir()}}
(RESULTS/'audit-8.1-protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2)+'\n')
PLAN['followupStage']=str(NEW);PLAN['auditImplementation']='8.1';PLAN['audit81Protocol']='audit-8.1-protocol.json';PLAN['auditImplementationStages']={'8.0':str(OLD),'8.1':str(NEW)}
(RESULTS/'run-plan.json').write_text(json.dumps(PLAN,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'initialAuditsUnchanged':len(initial),'recoveryAuditChanges':len(changes),'stage':str(NEW)}))
