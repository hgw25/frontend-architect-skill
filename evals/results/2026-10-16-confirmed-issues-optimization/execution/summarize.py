"""Validate new-protocol captures and keep initial, repair and repeat evidence distinct."""
from pathlib import Path
from collections import Counter
import csv,hashlib,json,sys
R=Path(__file__).resolve().parents[1];P=json.loads((R/'plan.json').read_text());STAGE=Path(P['stage'])
sys.path.insert(0,str(STAGE/'candidate/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
cases={case['id']:case for case in runner.load_cases(None)}
rows=[];errors=[]
for cohort in ('initial','dialog-repeat','route-repeat','repeats','capture-recovery','final-forward/main','final-forward/dialog'):
    root=R/cohort
    if not root.exists():continue
    for path in sorted(root.glob('*/*/manifest.json')):
        manifest=json.loads(path.read_text())
        score_file=path.parent/'blind-scores/scores.json'
        scores={s['id']:s for s in json.loads(score_file.read_text())['conditions'].get('candidate',[])}if score_file.exists()else{}
        for record in manifest['cases']:
            name=record['id'];condition=path.parts[-3];folder=path.parent/name/'candidate'
            issues=scorer.captured_evidence_errors(record,cases[name],folder)
            frozen=Path(P['finalGuideSnapshot'])if cohort.startswith('final-forward/')else R/'frozen-inputs'/condition
            guide=Path(record['workspace'])/'.frontend-architect'
            for file in ['SKILL.md','CONTRIBUTING.md',*[str(p.relative_to(frozen))for p in (frozen/'references').glob('*.md')]]:
                archived=frozen/(Path(file).stem+'.snapshot.md'if '/'not in file else file)
                if (guide/file).read_bytes()!=archived.read_bytes():issues.append('Guidance changed: '+file)
            scoring_log=path.parent/'scoring.log'
            scoring_finished=scoring_log.exists()and'\nEXIT: 'in scoring_log.read_text()
            score=scores.get(name,{})if scoring_finished else{}
            rows.append({'cohort':cohort,'condition':condition,'id':name,'path':str(folder.relative_to(R)),
                'captureErrors':issues,'score':score.get('normalized_score'),'verdict':score.get('verdict','pending'),
                'globalFailures':score.get('global_failures',[]),'caseFailures':score.get('case_failures',[]),
                'generationAttempts':len(record.get('attempts',[])),
                'firstHostFailures':[v['command']for v in record['attempts'][0]['validations']if v['exit_code']!=0],
                'finalHostFailures':[v['command']for v in record['validations']if v['exit_code']!=0],
                'contentFiles':record['reference_routing']['content_files'],
                'discoveryFiles':record['reference_routing']['discovery_files']})
for name,digest in json.loads((R/'input-hashes.json').read_text()).items():
    if hashlib.sha256((R/'frozen-inputs'/name).read_bytes()).hexdigest()!=digest:errors.append('Frozen input changed: '+name)
for condition in ('candidate',):
    frozen=Path(P.get('finalGuideSnapshot',R/'frozen-inputs'/condition))
    for file in ['SKILL.md','CONTRIBUTING.md',*[str(p.relative_to(frozen))for p in (frozen/'references').glob('*.md')]]:
        archived=frozen/(Path(file).stem+'.snapshot.md'if '/'not in file else file)
        if (R.parents[2]/file).read_bytes()!=archived.read_bytes():errors.append('Source guidance changed: '+file)
pairs=[];selected=[];rank={'fail':0,'basic':1,'target':2}
for name in P['protocol']['targetedCases']:
    row={'id':name};reasons=[]
    for condition in ('previous','candidate'):
        sample=next((r for r in rows if r['cohort']=='initial'and r['condition']==condition and r['id']==name),{})
        row[condition+'Score']=sample.get('score');row[condition+'Verdict']=sample.get('verdict','pending')
    row['scoreDelta']=round(row['candidateScore']-row['previousScore'],4)if all(row[c+'Score']is not None for c in ('previous','candidate'))else None
    if all(row[c+'Verdict']in rank for c in ('previous','candidate')):
        if rank[row['candidateVerdict']]<rank[row['previousVerdict']]:reasons.append('candidate verdict downgrade')
        if row['scoreDelta']<=-1:reasons.append('score decline >=1')
    if name=='accessible-dialog-primitive':reasons.append('registered Dialog repeat')
    if reasons:selected.append({'case':name,'conditions':['candidate','previous'],'reasons':reasons})
    pairs.append(row)
out={'records':rows,'pairs':pairs,'repeatSelection':selected,'errors':errors,
     'cohortCounts':{cohort:{condition:dict(Counter(r['verdict']for r in rows if r['cohort']==cohort and r['condition']==condition))for condition in ('previous','candidate')}for cohort in sorted({r['cohort']for r in rows})},
     'capturedSamples':len(rows),'generationAttempts':sum(r['generationAttempts']for r in rows)}
(R/'summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
with (R/'comparison.csv').open('w',newline='')as stream:
    writer=csv.DictWriter(stream,fieldnames=['id','previousScore','candidateScore','previousVerdict','candidateVerdict','scoreDelta']);writer.writeheader();writer.writerows(pairs)
print(json.dumps({k:out[k]for k in ['cohortCounts','capturedSamples','generationAttempts','repeatSelection','errors']},ensure_ascii=False))
