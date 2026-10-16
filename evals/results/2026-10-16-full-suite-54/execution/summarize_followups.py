"""Preserve follow-up samples and report recovery coverage without replacing first results."""
from pathlib import Path
from collections import Counter
import csv,json,sys
RESULTS=Path(__file__).resolve().parents[1]
PLAN=json.loads((RESULTS/'run-plan.json').read_text())
sys.path.insert(0,str(Path(PLAN['followupStage'])/'candidate/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
CASES={case['id']:case for case in runner.load_cases(None)}
cohorts={};errors=[]
for cohort in ('capture-recovery','capture-recovery-audit8.1','repeats'):
    directory=RESULTS/cohort
    if not directory.exists():continue
    selection=json.loads((directory/'selection.json').read_text())
    expected={(job['case'],condition) for job in selection['jobs'] for condition in job['conditions']}
    records=[]
    for condition in ('previous','candidate'):
        for manifest_path in sorted((directory/condition).glob('*/manifest.json')):
            manifest=json.loads(manifest_path.read_text())
            score_file=manifest_path.parent/'blind-scores/scores.json'
            scores={s['id']:s for s in json.loads(score_file.read_text())['conditions'].get('candidate',[])} if score_file.exists() else {}
            for record in manifest['cases']:
                case_id=record['id'];folder=manifest_path.parent/case_id/record['mode']
                issues=scorer.captured_evidence_errors(record,CASES[case_id],folder)
                guidance=Path(record['workspace'])/'.frontend-architect'
                frozen=RESULTS/'frozen-inputs'/condition
                for file in ('SKILL.md','CONTRIBUTING.md',*[str(p.relative_to(frozen)) for p in (frozen/'references').glob('*.md')]):
                    archived=frozen/(Path(file).stem+'.snapshot.md' if '/'not in file else file)
                    if not (guidance/file).is_file()or(guidance/file).read_bytes()!=archived.read_bytes():issues.append('Guidance differs: '+file)
                score=scores.get(case_id,{})
                records.append({'condition':condition,'id':case_id,'path':str(folder.relative_to(RESULTS)),'captureErrors':issues,'score':score.get('normalized_score'),'verdict':score.get('verdict','unscored'),'globalFailures':score.get('global_failures',[]),'caseFailures':score.get('case_failures',[]),'validationFailures':[v['command']for v in record['validations']if v['exit_code']!=0]})
    actual=[(r['id'],r['condition'])for r in records]
    if len(actual)!=len(set(actual))or set(actual)!=expected:errors.append('Missing/duplicate follow-up records: '+cohort)
    cohorts[cohort]={'counts':{condition:dict(Counter(r['verdict']for r in records if r['condition']==condition))for condition in ('previous','candidate')},'records':records,'newGenerations':0 if cohort=='capture-recovery-audit8.1' else len(records)}
initial=json.loads((RESULTS/'audit-v8-summary.json').read_text())
coverage=[]
for pair in initial['pairs']:
    row={'id':pair['id']}
    for condition in ('previous','candidate'):
        score=pair[condition+'Score'];verdict=pair[condition+'Verdict'];source='initial'
        if verdict=='invalid':
            recovery=next((r for cohort in ('capture-recovery-audit8.1','capture-recovery') for r in cohorts.get(cohort,{}).get('records',[])if r['id']==pair['id']and r['condition']==condition and not r['captureErrors'] and r['score']is not None),None)
            if recovery and not recovery['captureErrors'] and recovery['score']is not None:
                score=recovery['score'];verdict=recovery['verdict'];source='capture-recovery-audit8.1' if recovery in cohorts.get('capture-recovery-audit8.1',{}).get('records',[]) else 'capture-recovery'
        row[condition]={'score':score,'verdict':verdict,'source':source,'initialVerdict':pair[condition+'Verdict']}
    coverage.append(row)
repeat_records={(r['id'],r['condition']):r for r in cohorts.get('repeats',{}).get('records',[])}
repeat_pairs=[]
for job in json.loads((RESULTS/'repeats/selection.json').read_text())['jobs'] if (RESULTS/'repeats/selection.json').exists() else []:
    row={'id':job['case']}
    for condition in ('previous','candidate'):
        record=repeat_records.get((job['case'],condition),{})
        row[condition+'Score']=record.get('score');row[condition+'Verdict']=record.get('verdict','pending')
    row['scoreDelta']=round(row['candidateScore']-row['previousScore'],4) if all(row[c+'Score']is not None for c in ('previous','candidate')) else None
    repeat_pairs.append(row)
output={'cohorts':cohorts,'errors':errors,'repeatPairs':repeat_pairs,'coverageView':coverage,'coverageCounts':{condition:dict(Counter(row[condition]['verdict']for row in coverage))for condition in ('previous','candidate')},'rule':'Initial failures remain unchanged. Coverage may use the single pre-registered valid recovery only where initial capture was invalid. Audit8.1 is the exact same recovery generation with only the documented parser correction; zero new generations, original invalid audit retained. Repeats are separate; no best-score selection or majority replacement.'}
(RESULTS/'followups-summary.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
with (RESULTS/'repeat-comparison.csv').open('w',newline='')as stream:
    writer=csv.DictWriter(stream,fieldnames=['id','previousScore','candidateScore','previousVerdict','candidateVerdict','scoreDelta']);writer.writeheader();writer.writerows(repeat_pairs)
print(json.dumps({'counts':{c:v['counts']for c,v in cohorts.items()},'errors':errors},ensure_ascii=False))
