"""Check actual deliverable presence/order, independently of prose scoring."""
from pathlib import Path
import json
import sys

required = {'autonomous-feature-development', 'autonomous-architecture-design', 'autonomous-reorder-design', 'autonomous-filter-design'}
failed = False
for argument in sys.argv[1:]:
    root = Path(argument)
    manifest = json.loads((root / 'manifest.json').read_text())
    checks = []
    for record in manifest['cases']:
        if record['id'] not in required:
            continue
        folder = root / record['id'] / record['mode']
        artifacts = folder / 'artifacts'
        documents = [str(p.relative_to(artifacts)) for p in artifacts.rglob('*')
                     if p.is_file() and p.suffix in {'.md', '.html', '.pdf', '.tex'}
                     and p.name != 'README.md']
        workspace = Path(record['workspace']).resolve()
        writes = json.loads((folder / 'write-order.json').read_text())
        doc_events = []
        code_events = []
        for write in writes:
            for raw in write.get('paths', []):
                path = Path(raw).resolve()
                relative = path.relative_to(workspace)
                if str(relative) in documents:
                    doc_events.append(write['event_line'])
                if relative.parts[0] in {'src', 'test', 'tests'} and path.suffix not in {'.md', '.svg'}:
                    code_events.append(write['event_line'])
        before_code = (min(doc_events) < min(code_events)) if doc_events and code_events else None
        source_files = [str(p.relative_to(artifacts)) for prefix in ('src', 'test', 'tests')
                        for p in (artifacts / prefix).rglob('*') if p.is_file()]
        passed = bool(documents)
        if record['id'] == 'autonomous-feature-development':
            passed = passed and before_code is True
        else:
            passed = passed and not source_files
        checks.append({'id': record['id'], 'mode': record['mode'], 'documents': documents,
                       'first_document_event': min(doc_events) if doc_events else None,
                       'first_code_event': min(code_events) if code_events else None,
                       'document_precedes_code': before_code,
                       'source_or_test_files': source_files, 'passed': passed})
    (root / 'artifact-checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
    if any(not item['passed'] for item in checks):
        failed = True
    print(root.name, [(item['id'], item['mode'], item['passed']) for item in checks])
# These checks concern only the observed file writes; diagram meanings and code
# quality still require the independent semantic review.
raise SystemExit(1 if failed else 0)
