"""One fixed paired capture recovery after the original Dialog generation timed out."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import os
import subprocess
import sys

RESULTS = Path(__file__).resolve().parent.parent
PLAN = json.loads((RESULTS / 'run-plan.json').read_text())
STAGE = Path(PLAN['stage'])
RECOVERY = RESULTS / 'capture-recovery'
ENV = {**os.environ, 'PATH': str(STAGE / 'bin') + os.pathsep + os.environ['PATH']}
CASE = 'accessible-dialog-primitive'


def execute(command, log):
    with log.open('w') as stream:
        stream.write('COMMAND: ' + repr(command) + '\n'); stream.flush()
        code = subprocess.run(command, env=ENV, stdout=stream, stderr=subprocess.STDOUT).returncode
    return code


def worker(condition):
    folder = RECOVERY / condition / 'shard-1'
    folder.mkdir(parents=True)
    capture = [sys.executable, str(STAGE / condition / 'scripts/run_behavior_evals.py'),
               '--case', CASE, '--mode', 'candidate', '--model', PLAN['model'],
               '--reasoning-effort', PLAN['reasoning_effort'], '--timeout-seconds', '900',
               '--results-dir', str(folder)]
    code = execute(capture, folder / 'capture.log')
    record = json.loads((folder / 'manifest.json').read_text())['cases'][0]
    result = {'condition': condition, 'captureExitCode': code, 'generation': record['generation']}
    if record['generation']['exit_code'] == 0:
        command = [sys.executable, str(RESULTS / 'scoring-tools/scripts/score_behavior_evals.py'),
                   '--results-dir', str(folder), '--mode', 'candidate', '--model', PLAN['model'],
                   '--reasoning-effort', PLAN['reasoning_effort'], '--timeout-seconds', '900']
        result['scoringExitCode'] = execute(command, folder / 'scoring.log')
    print(json.dumps(result), flush=True)
    return result


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(worker, ('previous', 'candidate')))
    (RECOVERY / 'outcomes.json').write_text(json.dumps(outcomes, indent=2) + '\n')
