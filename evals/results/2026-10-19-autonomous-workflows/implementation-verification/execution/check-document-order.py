"""Inspect retained write events, without inferring arbitrary shell write order."""
from pathlib import Path
import json
import sys

for argument in sys.argv[1:]:
    group = Path(argument)
    manifest = json.loads((group / 'manifest.json').read_text())
    checks = []
    for record in manifest['cases']:
        folder = group / record['id'] / record['mode']
        artifacts = folder / 'artifacts'
        workspace = Path(record['workspace']).resolve()
        documents = [str(path.relative_to(artifacts)) for path in artifacts.rglob('*.md')
                     if path.name != 'README.md'
                     and not set(path.parts).intersection({'test-results', 'playwright-report'})]
        document_events, implementation_events, shell_writes = [], [], []
        for write in json.loads((folder / 'write-order.json').read_text()):
            if 'command' in write:
                shell_writes.append(write)
            for raw in write.get('paths', []):
                path = Path(raw)
                if not path.is_absolute():
                    path = workspace / path
                relative = str(path.resolve().relative_to(workspace))
                if relative in documents:
                    document_events.append(write['event_line'])
                if relative.startswith(('src/', 'server/', 'packages/', 'test/', 'tests/')) and path.suffix not in {'.md', '.svg'}:
                    implementation_events.append(write['event_line'])
        before = min(document_events) < min(implementation_events) if document_events and implementation_events else None
        checks.append({'id': record['id'], 'mode': record['mode'], 'documents': documents,
                       'document_event_lines': document_events, 'implementation_event_lines': implementation_events,
                       'document_precedes_implementation': before, 'shell_writes_requiring_manual_review': shell_writes,
                       'scope': 'File-change events only; causal local defect repairs may need no design document. Diagram meaning and step-to-code mapping require semantic review.'})
    (group / 'document-order.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
    print(group.name, [(item['mode'], item['document_precedes_implementation']) for item in checks])
