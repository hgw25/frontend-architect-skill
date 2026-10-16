"""Verify immutable inputs, same-generation raw evidence, and complete cohort accounting."""
from pathlib import Path
import datetime,hashlib,json,subprocess

ROOT=Path(__file__).resolve().parents[1]
PLAN=json.loads((ROOT/'run-plan.json').read_text())
SOURCE=Path(PLAN['sourceRoot'])
errors=[];counts={}

def verify_hashes(receipt,roots,label):
    hashes=json.loads(receipt.read_text())
    for name,digest in hashes.items():
        for root in roots:
            path=root/name
            if not path.is_file()or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
                errors.append(f'{label}: {path}')
    counts[label]=len(hashes)

verify_hashes(ROOT/'input-hashes.json',[ROOT/'frozen-inputs'],'frozenInputFiles')
verify_hashes(ROOT/'audit-repair/raw-evidence-hashes.json',[ROOT,ROOT/'audit-repair'],'unchangedInitialRawFiles')
corrected=ROOT/'capture-recovery-audit8.1/previous/accessible-dialog-primitive'
verify_hashes(corrected/'raw-evidence-check.json',[corrected,ROOT/'capture-recovery/previous/accessible-dialog-primitive'],'unchangedCorrectedRecoveryRawFiles')

guidance=json.loads((ROOT/'installed-guidance-current-check.json').read_text())
for name,old in guidance.items():
    for label,base in [('source',SOURCE),('installed',Path('/Users/heguangwei/.codex/skills/frontend-architect'))]:
        path=base/name
        if not path.is_file()or hashlib.sha256(path.read_bytes()).hexdigest()!=old[label]:
            errors.append('Runtime guidance changed: '+str(path))
counts['unchangedSourceAndInstalledGuidanceFiles']=len(guidance)
head=subprocess.run(['git','rev-parse','HEAD'],cwd=SOURCE,text=True,capture_output=True,check=True).stdout.strip()
if head!=PLAN['sourceHead']:errors.append('Source HEAD changed')

initial=json.loads((ROOT/'audit-v8-summary.json').read_text())
errors.extend(initial['frozenInputErrors'])
for condition,data in initial['counts'].items():
    if data['captured']!=54 or data['missingCaptures']or data['missingScores']:
        errors.append('Initial cohort incomplete: '+condition)
counts['initialGenerations']=sum(data['captured']for data in initial['counts'].values())

followups=json.loads((ROOT/'followups-summary.json').read_text())
errors.extend(followups['errors'])
for cohort,expected in [('capture-recovery',3),('repeats',14)]:
    outcomes=json.loads((ROOT/cohort/'outcomes.json').read_text())['outcomes']
    if len(outcomes)!=expected or any('error'in row for row in outcomes):
        errors.append('Incomplete outcomes: '+cohort)
    records=followups['cohorts'][cohort]['records']
    if len(records)!=expected or any(row['verdict']=='unscored'for row in records):
        errors.append('Incomplete evidence/scoring: '+cohort)
    counts[cohort+'Generations']=len(records)
counts['correctedRecoveryNewGenerations']=followups['cohorts']['capture-recovery-audit8.1']['newGenerations']
counts['totalGeneratedSamples']=counts['initialGenerations']+counts['capture-recoveryGenerations']+counts['repeatsGenerations']

manifests=[*(ROOT/'audit-repair').glob('*/shard-*/batch-*/manifest.json'),*(ROOT/'capture-recovery').glob('*/*/manifest.json'),*(ROOT/'repeats').glob('*/*/manifest.json')]
workspaces=set()
for path in manifests:
    manifest=json.loads(path.read_text())
    if manifest['model']!=PLAN['model']or manifest['reasoning_effort']!=PLAN['reasoning_effort']:
        errors.append('Generation configuration mismatch: '+str(path))
    for record in manifest['cases']:workspaces.add(Path(record['workspace']).resolve())
counts['distinctGeneratedWorkspaces']=len(workspaces)

processes=subprocess.run(['ps','-ax','-o','pid=,comm='],capture_output=True,text=True,check=True)
matches=[];unreadable=[]
for line in processes.stdout.splitlines():
    fields=line.strip().split(None,1)
    if len(fields)!=2 or Path(fields[1]).name not in {'node','npm','npx'}:continue
    pid,command=fields
    cwd=subprocess.run(['/usr/sbin/lsof','-a','-p',pid,'-d','cwd','-Fn'],capture_output=True,text=True)
    names=[row[1:]for row in cwd.stdout.splitlines()if row.startswith('n/')]
    if not names:
        if subprocess.run(['kill','-0',pid],capture_output=True).returncode==0:unreadable.append(int(pid))
        continue
    path=Path(names[0]).resolve()
    if any(path==workspace or workspace in path.parents for workspace in workspaces):
        matches.append({'pid':int(pid),'command':command,'cwd':str(path)})
(ROOT/'final-benchmark-process-check.json').write_text(json.dumps({'scope':'Read-only check for Node/npm/npx cwd within exact generated workspaces; unrelated process details omitted; no processes killed','matches':matches,'liveProcessesWithUnreadableCwd':unreadable},indent=2)+'\n')
if matches:errors.append('Generated-workspace processes still live; inspect final-benchmark-process-check.json')

protocol=json.loads((ROOT/'audit-8.1-protocol.json').read_text())
if sum(row['sameAuditObject']for row in protocol['equivalenceProof']if row['phase']=='audit-repair')!=108:
    errors.append('Audit implementation equivalence proof incomplete')
for name,digest in protocol['toolHashes'].items():
    if hashlib.sha256((SOURCE/'scripts'/name).read_bytes()).hexdigest()!=digest:
        errors.append('Audit implementation changed: '+name)
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':counts,'sourceHead':head,'errors':errors,'claim':'Initial and follow-up samples retain separate identities. Parser-only corrected recovery adds zero generations. Hash equality proves byte integrity, not behavior beyond the captured checks.'}
(ROOT/'final-integrity.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out,ensure_ascii=False))
raise SystemExit(bool(errors))
