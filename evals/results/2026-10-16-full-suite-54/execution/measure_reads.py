"""Measure returned guidance text in the existing capture protocol, without grading it."""
from pathlib import Path
import csv
import json
import shlex
import sys

RESULTS = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
PLAN=json.loads((RESULTS/'run-plan.json').read_text())
CANONICAL=(RESULTS/'audit-repair').exists()
DATA=RESULTS/'audit-repair' if CANONICAL else RESULTS
INPUTS=Path(PLAN['followupStage'])/'candidate' if CANONICAL else RESULTS/'frozen-inputs/candidate'
sys.path.insert(0, str(INPUTS / 'scripts'))
import run_behavior_evals as runner
import score_behavior_evals as scorer
CASES={c["id"]:c for c in runner.load_cases(None)}

rows, details = [], []
for condition in ('previous', 'candidate'):
    for manifest in sorted((DATA / condition).glob('shard-*/batch-*/manifest.json')):
        for record in json.loads(manifest.read_text())['cases']:
            events = manifest.parent / Path(record['response']).parent / 'events.jsonl'
            reads, totals = [], {'entry': 0, 'reference': 0, 'mixed': 0}
            for line in events.read_text().splitlines():
                event = json.loads(line)
                item = event.get('item', {})
                if event.get('type') != 'item.completed' or item.get('type') != 'command_execution':
                    continue
                paths, issue = runner.guidance_read_paths(item, Path(record['workspace']))
                if not paths or issue:
                    continue
                kinds = {'entry' if Path(p).name == 'SKILL.md' else 'reference' for p in paths}
                category = next(iter(kinds)) if len(kinds) == 1 else 'mixed'
                words = shlex.split(item['command'])
                if len(words) == 3 and Path(words[0]).name in {'sh', 'bash', 'zsh'}:
                    words = shlex.split(words[2])
                kind = {'rg': 'heading inventory', 'sed': 'range', 'cat': 'whole file'}[Path(words[0]).name]
                characters = len(item.get('aggregated_output', ''))
                totals[category] += characters
                reads.append({'command': item['command'], 'paths': paths, 'category': category,
                              'kind': kind, 'returnedCharacters': characters})
            issues=scorer.captured_evidence_errors(record, CASES[record['id']], events.parent)
            row = {'condition': condition, 'id': record['id'], 'captureValid':not issues, 'captureErrors':issues,
                   'generationExitCode': record['generation']['exit_code'],
                   'entryCharacters': totals['entry'], 'referenceCharacters': totals['reference'],
                   'mixedCharacters': totals['mixed'], 'totalCharacters': sum(totals.values()),
                   'readOperations': len(reads), 'headingOperations': sum(r['kind'] == 'heading inventory' for r in reads),
                   'rangeOperations': sum(r['kind'] == 'range' for r in reads),
                   'topicCount': record['reference_routing']['topic_count'],
                   'auditStatus': record['reference_routing']['read_audit_status']}
            rows.append(row)
            details.append({**row, 'events': str(events.relative_to(RESULTS)), 'reads': reads})

pairs = []
for case_id in sorted({r['id'] for r in rows}):
    matched = {r['condition']: r for r in rows if r['id'] == case_id}
    if set(matched) != {'previous', 'candidate'}:
        continue
    before, after = matched['previous'], matched['candidate']
    if not before['captureValid'] or not after['captureValid']:
        continue  # Invalid captures retain raw reads but are excluded from paired aggregates.
    pairs.append({'id': case_id, 'previousCharacters': before['totalCharacters'],
                  'candidateCharacters': after['totalCharacters'],
                  'changeCharacters': after['totalCharacters'] - before['totalCharacters'],
                  'reductionPercent': round((1 - after['totalCharacters'] / before['totalCharacters']) * 100, 1)
                                      if before['totalCharacters'] else None})
output = {'metric': 'Raw captured output characters for guidance-reading commands, including heading inventories and repeated reads',
          'limits': 'Not serving tokens, actual model context, internal truncation/compression, time or billing; mixed file commands cannot be split exactly',
          'records': details, 'pairs': pairs}
(RESULTS / 'read-extent.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
with (RESULTS / 'read-extent.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader(); writer.writerows(rows)
print(json.dumps({'capturedArtifacts': len(rows), 'pairs': pairs, 'unknownAudits': [r['id'] for r in rows if r['auditStatus'] != 'recognized']}, ensure_ascii=False))
