"""Check actual returned entry text against frozen bytes; do not infer comprehension."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
counts={};issues=[];failed=[]
for condition in ('previous','candidate'):
    expected=(R/'frozen-inputs'/condition/'SKILL.snapshot.md').read_text();counts[condition]=0
    for path in (R/condition).glob('shard-*/batch-*/manifest.json'):
        for record in json.loads(path.read_text())['cases']:
            events=path.parent/record['id']/record['mode']/'events.jsonl'
            for line in events.read_text().splitlines():
                event=json.loads(line);item=event.get('item',{})
                if event.get('type')!='item.completed'or item.get('type')!='command_execution':continue
                if 'SKILL.md'not in item.get('command','')or'cat 'not in item.get('command',''):continue
                if item.get('exit_code')!=0:
                    failed.append({'condition':condition,'case':record['id'],'exitCode':item.get('exit_code'),'output':item.get('aggregated_output','')[:400]})
                    continue
                counts[condition]+=1
                if expected not in item.get('aggregated_output',''):
                    issues.append({'condition':condition,'case':record['id'],'command':item['command'],'returnedCharacters':len(item.get('aggregated_output',''))})
output={'completedCatOperations':counts,'nonExactOutputs':issues,'failedReadAttempts':failed,'criterion':'Complete frozen skill text is present verbatim in raw captured command output. This does not prove internal tool/context truncation, comprehension, or OS-level isolation.'}
(R/'full-skill-read-check.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(output,ensure_ascii=False))
raise SystemExit(bool(issues))
