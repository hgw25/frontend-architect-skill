"""Report initial captures and scores without replacing failures with repeats."""
from pathlib import Path
from collections import Counter
import csv,hashlib,json,statistics,sys
R=Path(__file__).resolve().parents[1];P=json.loads((R/'run-plan.json').read_text())
COHORT=sys.argv[1] if len(sys.argv)>1 else ('audit-v8' if (R/'audit-repair').exists() else 'strict-v7')
if COHORT not in {'strict-v7','audit-v8'}:raise SystemExit('Expected strict-v7 or audit-v8')
DATA=R/'audit-repair' if COHORT=='audit-v8' else R
TOOLS=Path(P['followupStage'])/'candidate/scripts' if COHORT=='audit-v8' else R/'frozen-inputs/candidate/scripts'
sys.path.insert(0,str(TOOLS))
import run_behavior_evals as runner
import score_behavior_evals as scorer
cases={c['id']:c for c in runner.load_cases(P['cases'])}
captures={c:{} for c in ('previous','candidate')}; scores={c:{} for c in captures};errors=[]
for condition in captures:
 for path in sorted((DATA/condition).glob('shard-*/batch-*/manifest.json')):
  for rec in json.loads(path.read_text())['cases']:
   cid=rec['id']; folder=path.parent/cid/rec['mode']
   issues=scorer.captured_evidence_errors(rec,cases[cid],folder)
   guide=Path(rec['workspace'])/'.frontend-architect'; frozen=R/'frozen-inputs'/condition
   for file in ['SKILL.md','CONTRIBUTING.md',*[str(x.relative_to(frozen)) for x in (frozen/'references').glob('*.md')]]:
    expected=frozen/(Path(file).stem+'.snapshot.md' if '/' not in file else file)
    if not (guide/file).is_file() or (guide/file).read_bytes()!=expected.read_bytes():issues.append('Changed/missing captured guidance: '+file)
   if cid in captures[condition]:errors.append('Duplicate capture: '+condition+'/'+cid)
   captures[condition][cid]={'id':cid,'path':str(folder.relative_to(R)),'generationExit':rec['generation']['exit_code'],'captureErrors':issues,'validationFailures':[v['command'] for v in rec['validations'] if v['exit_code']!=0],'generationSeconds':rec['generation']['duration_seconds'],'topicCount':rec['reference_routing']['topic_count']}
 for path in sorted((DATA/condition).glob('shard-*/batch-*/blind-scores/scores.json')):
  for score in json.loads(path.read_text())['conditions'].get('candidate',[]):
   if score['id'] in scores[condition]:errors.append('Duplicate score: '+condition+'/'+score['id'])
   scores[condition][score['id']]=score
for file,digest in json.loads((R/'input-hashes.json').read_text()).items():
 if hashlib.sha256((R/'frozen-inputs'/file).read_bytes()).hexdigest()!=digest:errors.append('Frozen input changed: '+file)
for file in ['SKILL.md','CONTRIBUTING.md',*[str(p.relative_to(Path(P['sourceRoot']))) for p in (Path(P['sourceRoot'])/'references').glob('*.md')]]:
 archived=R/'frozen-inputs/candidate'/(Path(file).stem+'.snapshot.md' if '/' not in file else file)
 if (Path(P['sourceRoot'])/file).read_bytes()!=archived.read_bytes():errors.append('Current guide changed: '+file)
pairs=[]; repeats=[]; rank={'fail':0,'basic':1,'target':2}
for cid in P['cases']:
 row={'id':cid}
 for condition in captures:
  score=scores[condition].get(cid,{});cap=captures[condition].get(cid,{})
  row[condition+'Score']=score.get('normalized_score');row[condition+'Verdict']=score.get('verdict','unscored' if cap else 'not-captured')
  row[condition+'Failures']=score.get('global_failures',[])+score.get('case_failures',[])+cap.get('validationFailures',[])
 reasons=[]
 if all(cid in scores[c] for c in scores):
  a,b=(scores[c][cid] for c in scores)
  if all('normalized_score' in s and s['verdict'] in rank for s in (a,b)):
   row['scoreDelta']=round(b['normalized_score']-a['normalized_score'],4)
   if rank[b['verdict']]<rank[a['verdict']]:reasons.append('candidate verdict downgrade')
   if row['scoreDelta']<=-1:reasons.append('normalized score decline >= 1.0')
   if {x['rule'] if isinstance(x,dict) else x for x in row['candidateFailures']}-{x['rule'] if isinstance(x,dict) else x for x in row['previousFailures']}:reasons.append('new candidate failure')
 if cid=='accessible-dialog-primitive':reasons.append('pre-registered high-variance Dialog repeat')
 if reasons:repeats.append({'id':cid,'reasons':reasons})
 pairs.append(row)
summary={'cohort':COHORT,'counts':{c:{'captured':len(captures[c]),'captureValid':sum(not x['captureErrors'] for x in captures[c].values()),'scored':sum('normalized_score'in x for x in scores[c].values()),'verdicts':dict(Counter(x['verdict'] for x in scores[c].values())),'missingCaptures':sorted(set(cases)-set(captures[c])),'missingScores':sorted(set(cases)-set(scores[c])),'meanScore':statistics.mean(x['normalized_score'] for x in scores[c].values() if 'normalized_score'in x) if any('normalized_score'in x for x in scores[c].values()) else None}for c in captures},'frozenInputErrors':errors,'captures':captures,'pairs':pairs,'repeatCandidates':repeats}
(R/(COHORT+'-summary.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
if COHORT=='audit-v8' or not (R/'audit-repair').exists():
 (R/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (R/(COHORT+'-comparison.csv')).open('w',newline='') as stream:
 fields=['id','previousScore','candidateScore','previousVerdict','candidateVerdict','scoreDelta','previousFailures','candidateFailures'];w=csv.DictWriter(stream,fieldnames=fields);w.writeheader();w.writerows(pairs)
print(json.dumps({'cohort':COHORT,'counts':{c:{k:v for k,v in d.items() if not k.startswith('missing')} for c,d in summary['counts'].items()},'frozenInputErrors':errors,'repeatCandidates':repeats},ensure_ascii=False))
