import json,sys
from pathlib import Path
prompt=sys.stdin.read()
repair='HOST FEEDBACK AFTER YOUR PREVIOUS DELIVERY:' in prompt
print(json.dumps({'type':'item.completed','item':{'type':'command_execution','command':'cat .frontend-architect/SKILL.md','exit_code':0,'aggregated_output':Path('.frontend-architect/SKILL.md').read_text()}}))
if repair or sys.argv[2] == 'direct': Path('state.txt').write_text('1')
Path(sys.argv[1]).write_text('Repair delivered; host checks pending.' if repair else 'First delivery; host checks pending.')
print(json.dumps({'type':'turn.completed'}))
