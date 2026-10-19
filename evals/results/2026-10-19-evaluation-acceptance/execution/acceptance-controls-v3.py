import argparse,hashlib,json,shutil,subprocess,sys,tempfile
from pathlib import Path
root=Path('/Users/heguangwei/project/skills/frontend-architect-skill')
sys.path.insert(0,str(root/'scripts'))
import score_behavior_evals as scorer
import run_behavior_evals as runner
from eval_evidence import project_snapshot,save_snapshot,resolve_acceptance
import yaml
results=root/'evals/results/2026-10-19-evaluation-acceptance'
old=root/'evals/results/2026-10-19-autonomous-workflows/judgment-refinement/verified-after'
document=yaml.safe_load((results/'frozen-acceptance-v3.yaml').read_text())
cases={case['id']:{**case,'_required_outcomes':resolve_acceptance(case,document['acceptance_profiles'])} for case in document['cases']}
for label,case_id in [('missing-evidence-v3','autonomous-live-board'),('aligned-positive-v3','autonomous-live-invites'),('document-drift-v3','autonomous-live-invites')]:
 original=old/case_id
 manifest=json.loads((original/'manifest.json').read_text());record=manifest['cases'][0]
 folder=results/'acceptance-controls'/label/case_id/'candidate';folder.mkdir(parents=True,exist_ok=True)
 source=original/case_id/'candidate'
 if record['capture_contract'] != runner.capture_contract(cases[case_id],root):
  raise RuntimeError('Historical fixture identity differs; do not reinterpret as this control')
 workspace=runner.initialize_workspace(cases[case_id],'baseline')
 try:
  save_snapshot(folder/'project-input.json',project_snapshot(workspace))
  subprocess.run(['git','apply','--binary',str(source/'changes.diff')],cwd=workspace,check=True)
  if case_id=='autonomous-live-invites':
   docs=[path for path in workspace.rglob('*.md') if path.name!='README.md' and '.git'not in path.parts]
   target=next(path for path in docs if 'sendInvitation' in path.read_text())
   (folder/'document-before.txt').write_text(target.read_text())
   text=target.read_text().replace('submitInvitation(email)', 'submitInvitation(event)').replace('moveInvitation(id, delta, focusButton)', 'moveInvitation(id, delta, focusTarget)')
   text+='\n## Delivery status and executed verification\n\nAll four delivery steps are complete: page state/rendering, send/overview separation, local interaction continuity, and focused browser verification. The first three implementation steps and fourth verification step are implemented as listed above. The final implementation and both diagrams were cross-read against src/app.mjs and src/transport.mjs.\n\nExecuted in the preserved generation record: npm ci (exit 0), npm run check (exit 0; 7 Chromium Playwright checks passed). Host independently repeated those commands and the same seven checks passed. These are the actual recorded results for this frozen code; no live email service or production backend was contacted. No physical-device or assistive-technology session is claimed. See the accompanying raw events and validation logs, not a planned run.\n'
   if label=='document-drift-v3':
    text=text.replace('sendInvitation(email)', 'sendInvitation(email, idempotencyKey)')
    text+='\n当前实现契约：sendInvitation 的第二个 idempotencyKey 参数为必填字符串，由页面生成并由每个调用方传入；src/transport.mjs 对缺失参数抛错。\n'
   target.write_text(text)
  save_snapshot(folder/'project-final.json',project_snapshot(workspace))
  (folder/'changes.diff').write_text(runner.capture_diff(workspace))
 finally:shutil.rmtree(workspace)
 for name in ['response.md','events.jsonl',*[f'validation-{i}.log'for i in range(1,len(record['validations'])+1)]]:
  shutil.copy2(source/name,folder/name)
 metadata={'kind':'retrospective acceptance control, not a new generator capture','source':str(original.relative_to(root)),
           'case':case_id,'mutation':label,'fixture_identity_matched':True}
 (folder/'control.json').write_text(json.dumps(metadata,indent=2)+'\n')
 prompt=scorer.build_failure_prompt('candidate',[record],cases,folder.parents[1])
 (folder/'audit.prompt.txt').write_text(prompt)
 scorer.output_failure_schema(folder/'failure-schema.json')
 args=argparse.Namespace(model='gpt-5.6-terra',reasoning_effort='medium',timeout_seconds=600)
 result=scorer.run_score(args,prompt,folder/'failure-schema.json',folder/'audit.json')
 (folder/'audit.stderr.log').write_text(result.stderr)
 if result.returncode:
  print(label,'model execution failed',result.returncode,flush=True);continue
 audits=scorer.validate_failure_audits(json.loads((folder/'audit.json').read_text()),[record],cases)
 (folder/'accepted-failures.json').write_text(json.dumps(audits,ensure_ascii=False,indent=2)+'\n')
 print(label,json.dumps(audits,ensure_ascii=False),flush=True)
