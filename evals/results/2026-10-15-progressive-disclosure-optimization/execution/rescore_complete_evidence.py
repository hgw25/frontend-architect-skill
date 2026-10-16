"""Regrade all captures with the same expanded check view, preserving first scores."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import time

RESULTS = Path(__file__).resolve().parent.parent
PLAN = json.loads((RESULTS / 'run-plan.json').read_text())
VIEW = RESULTS / 'scoring-evidence-complete'
ENV = {**os.environ, 'PATH': str(Path(PLAN['stage']) / 'bin') + os.pathsep + os.environ['PATH']}


def worker(index, ids):
    deadline = time.monotonic() + 1800
    while True:
        manifests = {}
        for condition in ('previous', 'candidate'):
            path = RESULTS / condition / ('shard-' + str(index)) / 'manifest.json'
            if path.exists():
                try:
                    record = json.loads(path.read_text())
                except json.JSONDecodeError:
                    continue  # The original capture may be writing this file.
                if sorted(c['id'] for c in record['cases']) == sorted(ids):
                    manifests[condition] = record
        if len(manifests) == 2:
            break
        if time.monotonic() >= deadline or (RESULTS / 'execution/outcomes.json').exists():
            raise RuntimeError('Capture did not complete for shard ' + str(index))
        time.sleep(5)
    for condition, manifest in manifests.items():
        source = RESULTS / condition / ('shard-' + str(index))
        target = VIEW / condition / source.name
        target.mkdir(parents=True)
        (target / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        for case_id in ids:
            shutil.copytree(source / case_id, target / case_id)
        command = [sys.executable, str(RESULTS / 'scoring-tools/scripts/score_behavior_evals.py'),
                   '--results-dir', str(target), '--mode', 'candidate', '--batch-size', '4',
                   '--model', PLAN['model'], '--reasoning-effort', PLAN['reasoning_effort'],
                   '--timeout-seconds', '900']
        with (target / 'scoring.log').open('w') as stream:
            stream.write('COMMAND: ' + repr(command) + '\n'); stream.flush()
            code = subprocess.run(command, env=ENV, stdout=stream, stderr=subprocess.STDOUT).returncode
        print(json.dumps({'shard': index, 'condition': condition, 'exitCode': code}), flush=True)
        if code:
            raise RuntimeError('Complete evidence scoring failed')
    return {'shard': index, 'status': 'complete'}


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(worker, i, ids) for i, ids in enumerate(PLAN['shards'], 1)]
        outcomes = []
        for future in futures:
            try:
                outcomes.append(future.result())
            except Exception as error:
                outcomes.append({'status': 'failed', 'error': str(error)})
    (RESULTS / 'execution/rescoring-outcomes.json').write_text(json.dumps(outcomes, indent=2) + '\n')
    raise SystemExit(0 if all(r['status'] == 'complete' for r in outcomes) else 1)
