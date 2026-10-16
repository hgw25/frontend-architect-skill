"""Coordinate frozen inputs through the repository capture and scoring tools."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import os
import subprocess
import sys
import time

RESULTS = Path(__file__).resolve().parent.parent
PLAN = json.loads((RESULTS / 'run-plan.json').read_text())
STAGE = Path(PLAN['stage'])
PYTHON = sys.executable
ENV = {**os.environ, 'PATH': str(STAGE / 'bin') + os.pathsep + os.environ['PATH']}


def execute(command, log):
    with log.open('w') as stream:
        stream.write('COMMAND: ' + repr(command) + '\n')
        stream.flush()
        completed = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, env=ENV)
        stream.write('\nEXIT: ' + str(completed.returncode) + '\n')
    return completed.returncode


def worker(index, ids):
    for number, case_id in enumerate(ids, 1):
        for version in ('previous', 'candidate'):
            folder = RESULTS / version / ('shard-' + str(index))
            folder.mkdir(exist_ok=True)
            command = [PYTHON, str(STAGE / version / 'scripts/run_behavior_evals.py'),
                       '--case', case_id, '--mode', 'candidate', '--append',
                       '--model', PLAN['model'], '--reasoning-effort', PLAN['reasoning_effort'],
                       '--timeout-seconds', '900', '--results-dir', str(folder)]
            code = execute(command, folder / (case_id + '.capture.log'))
            manifest = json.loads((folder / 'manifest.json').read_text())
            record = next(r for r in manifest['cases'] if r['id'] == case_id)
            print(json.dumps({'phase': 'capture', 'shard': index, 'condition': version,
                              'case': case_id, 'position': number, 'exit_code': code,
                              'generation_exit': record['generation']['exit_code'],
                              'audit': record['reference_routing']['read_audit_status']}, ensure_ascii=False), flush=True)
            if record['generation']['exit_code'] != 0:
                print(json.dumps({'phase': 'capture-service-failure', 'case': case_id,
                                  'condition': version, 'shard': index}), flush=True)
                return {'shard': index, 'status': 'generation_failed'}
    scores = {}
    for version in ('previous', 'candidate'):
        folder = RESULTS / version / ('shard-' + str(index))
        command = [PYTHON, str(STAGE / version / 'scripts/score_behavior_evals.py'),
                   '--results-dir', str(folder), '--mode', 'candidate', '--batch-size', '4',
                   '--model', PLAN['model'], '--reasoning-effort', PLAN['reasoning_effort'],
                   '--timeout-seconds', '900']
        scores[version] = execute(command, folder / 'scoring.log')
        print(json.dumps({'phase': 'scored', 'shard': index, 'condition': version,
                          'exit_code': scores[version]}), flush=True)
    return {'shard': index, 'status': 'finished', 'scoring_exit_codes': scores}


if __name__ == '__main__':
    started = time.time()
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(worker, i, ids) for i, ids in enumerate(PLAN['shards'], 1)]
        outcomes = []
        for future in futures:
            try:
                outcomes.append(future.result())
            except Exception as error:
                outcomes.append({'status': 'orchestration_error', 'reason': repr(error)})
                print(repr(error), flush=True)
    (RESULTS / 'execution/outcomes.json').write_text(json.dumps({
        'elapsed_seconds': round(time.time() - started, 1), 'workers': outcomes,
    }, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if all(o.get('status') == 'finished' and
                             all(c == 0 for c in o['scoring_exit_codes'].values())
                             for o in outcomes) else 1)
