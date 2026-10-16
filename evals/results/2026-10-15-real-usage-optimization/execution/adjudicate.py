from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import os
import subprocess
import sys

RESULTS = Path(__file__).resolve().parent.parent
plan = json.loads((RESULTS / 'run-plan.json').read_text())
environment = {**os.environ, 'PATH': str(Path(plan['stage']) / 'bin') + os.pathsep + os.environ['PATH']}

def score(job):
    batch, condition = job
    folder = RESULTS / 'adjudication' / batch / condition / 'shard-1'
    command = [sys.executable, str(RESULTS / 'audit-tools/scripts/score_behavior_evals.py'),
               '--results-dir', str(folder), '--mode', 'candidate', '--batch-size', '2',
               '--model', plan['model'], '--reasoning-effort', plan['reasoning_effort'],
               '--timeout-seconds', '900']
    with (folder / 'scoring.log').open('w') as stream:
        result = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, env=environment)
    print(json.dumps({'batch': batch, 'condition': condition, 'exitCode': result.returncode}), flush=True)
    return result.returncode

with ThreadPoolExecutor(max_workers=2) as pool:
    codes = list(pool.map(score, [(b, c) for b in ['main', 'recovery-repeat'] for c in ['previous', 'candidate']]))
raise SystemExit(bool(any(codes)))
