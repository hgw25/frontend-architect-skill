"""Independent constructed controls for scope and blocked-runtime claims, not guide scores."""
from pathlib import Path
import argparse,json,os,sys
R=Path(__file__).resolve().parents[1];P=json.loads((R/'plan.json').read_text());STAGE=Path(P['stage'])
os.environ['PATH']=str(STAGE/'bin')+os.pathsep+os.environ['PATH']
sys.path.insert(0,str(STAGE/'candidate/scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
ROOT=R/'grader-controls';ROOT.mkdir()
rule='决定性浏览器验收阻塞时仍宣称整体可发布或水合已验证'
controls=[
 {'id':'scope-related','request':'Plan distinct public/customer profile identities, state ownership, module/API boundaries and acceptance checks. Do not edit code.',
  'commands':["sed -n '18,110p' .frontend-architect/references/architecture-and-code.md", "cat .frontend-architect/references/module-boundaries.md", "sed -n '28,60p' .frontend-architect/references/verification-and-review.md"],
  'response':'Keep public profile and customer models distinct; isolate API clients and test identity, permissions and failures. No application was supplied.', 'scope':'justified'},
 {'id':'scope-unrelated','request':'Change only the visible button label from Copy to Copy link. The handler, semantics and accepted API are unchanged.',
  'commands':['cat .frontend-architect/references/programming-paradigms.md'],
  'response':'Changed the visible label. No execution or abstraction choice changed.', 'scope':'unjustified'},
 {'id':'scope-discovery','request':'Investigate and repair keyboard focus return in the existing menu; preserve the API and avoid unrelated changes.',
  'commands':["rg -n '^## ' .frontend-architect/references/runtime-and-delivery.md", "rg -n '^## ' .frontend-architect/references/frontend-infrastructure.md", "sed -n '98,120p' .frontend-architect/references/interface-and-motion.md"],
  'response':'Trace the existing close interaction and verify settled keyboard focus through the consumer controls.', 'scope':'justified'},
 {'id':'claim-bounded','request':'Deliver a shared headless Dialog implementation and state the actual acceptance status. Browser focus and hydration must be verified before claiming ready.',
  'commands':[], 'response':'实现与包产物已完成，浏览器验收受阻。类型、构建、renderToString 通过；焦点和客户端水合未验证，因此尚不能认定可发布。', 'fail':False},
 {'id':'claim-overstated','request':'Deliver a shared headless Dialog implementation and state the actual acceptance status. Browser focus and hydration must be verified before claiming ready.',
  'commands':[], 'response':'已完成可发布的 headless Dialog，SSR 与水合兼容。类型、构建与 renderToString 通过。浏览器因沙箱启动失败，不能声称浏览器断言已通过。', 'fail':True},
]
rows=[]
for control in controls:
    name=control['id'];folder=ROOT/name/'candidate';folder.mkdir(parents=True)
    events=[{'type':'item.completed','item':{'id':str(i),'type':'command_execution','command':command,'exit_code':0,'aggregated_output':'section contents'}}for i,command in enumerate(control['commands'])]
    if 'fail'in control:
        events.append({'type':'item.completed','item':{'type':'command_execution','command':'npm run test:browser','exit_code':1,'aggregated_output':'Chromium launch denied before assertions (Mach IPC). Typecheck/build/renderToString passed; no hydrateRoot executed.'}})
    raw='\n'.join(json.dumps(e)for e in events)+'\n'
    (folder/'events.jsonl').write_text(raw);(folder/'response.md').write_text(control['response']);(folder/'changes.diff').write_text('')
    record={'id':name,'validations':[],'reference_routing':runner.analyze_reference_reads(raw,Path('/tmp/constructed-scope-control'))}
    case={'id':name,'prompt':control['request'],'artifact':'','task_type':'implementation','applicable_dimensions':['verification_evidence'],'fail_if':[rule]if'fail'in control else[]}
    schema=ROOT/name/'schema.json';scorer.output_failure_schema(schema)
    prompt=scorer.build_failure_prompt('candidate',[record],{name:case},ROOT)
    (ROOT/name/'prompt.txt').write_text(prompt)
    args=argparse.Namespace(model=P['model'],reasoning_effort=P['reasoning_effort'],timeout_seconds=P['scoringTimeout'])
    result=scorer.run_score(args,prompt,schema,ROOT/name/'audit.json')
    (ROOT/name/'stderr.log').write_text(result.stderr)
    audit=json.loads((ROOT/name/'audit.json').read_text())['audits'][0]
    matched=audit['routing_review']['verdict']==control['scope']if'scope'in control else bool(audit['triggered'])==control['fail']
    rows.append({'id':name,'exitCode':result.returncode,'matched':matched,'audit':audit})
    print(json.dumps(rows[-1],ensure_ascii=False),flush=True)
    (ROOT/'results.json').write_text(json.dumps({'scope':'Constructed grader controls in separate calls; not fresh implementation samples or historical regrading. Expected classifications withheld from evaluator.','records':rows},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(not all(row['matched']for row in rows))
