from pathlib import Path
import sys,json,hashlib,subprocess
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
import run_behavior_evals as runner
from eval_evidence import project_snapshot,save_snapshot
import yaml
folder=root/'evals/results/2026-10-19-evaluation-acceptance/native-invites'
plan=json.loads((folder/'plan.json').read_text());work=Path(plan['workspace'])
case=next(case for case in yaml.safe_load((root/'evals/results/2026-10-19-evaluation-acceptance/frozen-final-cases.yaml').read_text())['cases'] if case['id']=='autonomous-live-invites')
original=json.loads((folder/'project-input.json').read_text())['files']['tests/invites.spec.mjs']['text'].encode()
source='native-original-invites.mjs';case['_acceptance_inputs']={source:original}
for check in case['acceptance_checks']:
 for src in check['files'].values():case['_acceptance_inputs'][src]=(root/src).read_bytes()
case['acceptance_checks']=[{'name':'original-public-contract','command':'npx playwright test tests/acceptance/original-invites.spec.mjs','files':{'tests/acceptance/original-invites.spec.mjs':source}},*case['acceptance_checks']]
results=[]
for command in ['npm run check','git diff --check']:
 results.append({'command':command,**runner.run_command(command,cwd=work,timeout=180,shell=True)})
results.extend(runner.run_acceptance_checks(case,work,180))
for i,result in enumerate(results,1):
 (folder/f'host-validation-{i}.log').write_text(result.pop('stdout')+result.pop('stderr'))
final_sha=save_snapshot(folder/'project-final.json',project_snapshot(work))
(folder/'changes.diff').write_text(runner.capture_diff(work))
(folder/'response.md').write_text('已完成发送、回执展示及列表操作。\n\n统计失败仍保留发送确认与新增邀请，可独立重读；发送期间保留后续输入和 Team note 选区；排序仅更新本页，连续键盘操作保持同一按钮焦点。Chromium 13/13 通过；语法与差异检查通过。未调用真实邮件服务。\n\n技术设计与验收记录：docs/team-invitations.md\n')
protected=runner.validate_protected_paths(case,work)
(folder/'protected-path-review.log').write_text(protected['stdout']+protected['stderr'])
guidance=json.loads((folder.parent/'final-plan.json').read_text())['guidance_sha256']
summary={'kind':'independent native forward test; not a CLI capture and not a CLI audit target','agent':'/root/invites_forward','fork_history':'none','extra_diagnostic_prompts':False,'project_final_sha256':final_sha,'checks':results,'protected_paths_check':{'exit_code':protected['exit_code'],'note':'Native task only specified requirement, workspace and skill; agent extended and strengthened existing tests. Frozen original checks run separately in isolated copy; this is not relabeled a protected CLI capture.'},'frozen_guidance_match':all(hashlib.sha256((work/'.frontend-architect'/name).read_bytes()).hexdigest()==digest for name,digest in guidance.items()),'manual_review':'Checked final form/list/overview definitions, transport signatures, app callback, both diagrams, all three delivery steps and actual results. No discrepancy found. Timing/read event stream is not available in this native evidence.'}
(folder/'host-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
