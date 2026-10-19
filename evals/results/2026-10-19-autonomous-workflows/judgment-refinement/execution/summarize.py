from pathlib import Path
import json
out=Path(__file__).resolve().parent.parent;rows=[]
for manifest in sorted(out.glob('*/*/manifest.json')):
 m=json.loads(manifest.read_text())
 if not m.get('completed_at'):continue
 group=manifest.parent
 for c in m['cases']:
  folder=group/c['id']/c['mode'];events=folder/'events.jsonl'
  errors=[];tests=[];costs=[];writes=[]
  for i,line in enumerate(events.read_text().splitlines(),1):
   event=json.loads(line);item=event.get('item',{})
   if event.get('type') in {'error','turn.failed'}:errors.append(event)
   if event.get('type')=='item.completed' and item.get('type')=='command_execution':
    command=item.get('command','');output=item.get('aggregated_output','')
    if any(s in command for s in ['npm run check','playwright test','node --test','npm ci','git worktree','git archive']):tests.append({'line':i,'command':command,'exit_code':item.get('exit_code'),'output_tail':output[-2000:]})
    samples=[line for line in output.splitlines() if line.startswith('BROWSER_COST {')]
    if samples:costs.append({'line':i,'command':command,'samples':samples})
   if event.get('type')=='item.completed' and item.get('type')=='file_change':writes.append({'line':i,'paths':[p['path'] for p in item.get('changes',[])]})
  (folder/'execution-index.json').write_text(json.dumps({'commands':tests,'browser_costs':costs,'writes':writes,'errors':errors},ensure_ascii=False,indent=2)+'\n')
  scorefile=group/'blind-scores/scores.json';score=None
  if scorefile.exists():
   scores=json.loads(scorefile.read_text());found=[x for x in scores.get('conditions',{}).get(c['mode'],[]) if x.get('id')==c['id']];score=found[0] if found else None
  row={'group':str(group.relative_to(out)),'case':c['id'],'model':m['model'],'generation_exit':c['generation']['exit_code'],'errors':errors,'validations':[(v['command'],v['exit_code']) for v in c['validations']],'routing_status':c['reference_routing']['read_audit_status'],'isolation_ok':c['reference_routing']['isolation_ok'],'score':score}
  rows.append(row)
(out/'outcomes.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for row in rows:print(row['group'],row['generation_exit'],row['routing_status'],[v[1] for v in row['validations']],row['score'].get('verdict') if row['score'] else None)
