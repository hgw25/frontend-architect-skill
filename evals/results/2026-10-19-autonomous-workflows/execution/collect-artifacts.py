"""Retain completed task artifacts and the raw write-event order for this trial."""
from pathlib import Path
import json
import shutil
import sys

for argument in sys.argv[1:]:
    root = Path(argument)
    manifest = json.loads((root / 'manifest.json').read_text())
    for record in manifest['cases']:
        if not record['id'].startswith('autonomous-'):
            continue
        folder = root / record['id'] / record['mode']
        workspace = Path(record['workspace'])
        for source in workspace.rglob('*'):
            relative = source.relative_to(workspace)
            if source.is_file() and not set(relative.parts).intersection({'.git', '.frontend-architect', 'node_modules', 'dist'}):
                target = folder / 'artifacts' / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
        changes = []
        for index, line in enumerate((folder / 'events.jsonl').read_text().splitlines(), 1):
            event = json.loads(line)
            item = event.get('item', {})
            if event.get('type') == 'item.completed' and item.get('type') == 'file_change':
                changes.append({'event_line': index, 'paths': [c['path'] for c in item.get('changes', [])]})
            elif event.get('type') == 'item.completed' and item.get('type') == 'command_execution':
                command = item.get('command', '')
                if any(marker in command for marker in ('cat >', 'cat <<', 'write_text', 'writeFile', 'apply_patch')):
                    changes.append({'event_line': index, 'command': command})
        (folder / 'write-order.json').write_text(json.dumps(changes, ensure_ascii=False, indent=2) + '\n')
