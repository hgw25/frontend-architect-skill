Independent final verification, 2026-11-12

Conclusion: all original independently reproduced defects are now rejected before any scorer call. No remaining reproducible issue was observed in the tested scope.

Original before-fix scripts/results remain unchanged in the parent directory; first-fix results remain in after/. For this final run the original probe.py and guidance_probe.py were copied with only BASE changed to final/ to avoid overwriting evidence. The archive_rescore.py from after/ was copied with the same path-only change. No semantic workaround or removed scenario was needed. Repository files were read only; all mutations were isolated /tmp artifacts. No external model service was called.

Executed commands

PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/final/probe.py > /tmp/fa-integrity-independent-20261112/final/probe.stdout.log 2> /tmp/fa-integrity-independent-20261112/final/probe.stderr.log
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/final/guidance_probe.py > /tmp/fa-integrity-independent-20261112/final/guidance.stdout.log 2> /tmp/fa-integrity-independent-20261112/final/guidance.stderr.log
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/final/archive_rescore.py > /tmp/fa-integrity-independent-20261112/final/archive.stdout.log 2> /tmp/fa-integrity-independent-20261112/final/archive.stderr.log
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/Users/heguangwei/project/skills/frontend-architect-skill/scripts /tmp/fa-integrity-independent-20261112/venv/bin/python -m unittest discover -s scripts -p 'test_*.py' > /tmp/fa-integrity-independent-20261112/final/unit.stdout.log 2> /tmp/fa-integrity-independent-20261112/final/unit.stderr.log

Observed results

- Ordinary product state 0→1: capture and first scoring pass; repeat scoring reuses the valid cache.
- Real two-round host repair: first validation exits [0,1], second [0,0], final snapshot contains state=1, capture and scoring pass.
- Ten independent bad-input variants: top-level response, diff, validation log; prior attempt response and guidance identity original; prior attempt validation exit metadata; missing round identity summary, conflicting per-round identity summary, removed attempts, changed manifest guidance identity. All exit 1 with invalid verdict, zero scorer calls, and no old target reused.
- Deleted generated workspace and removed all blind-scores cache: fresh scoring still succeeds using both local scorer stages and the archived evidence.
- Full regression independently run: 126 tests, OK.

Evidence index

summary.json: compact final assertions.
report.json / probe.stdout.log: direct, repair and primary mutation runs.
guidance-report.json / guidance.stdout.log: guidance consistency runs.
archive-report.json / archive.stdout.log: no-workspace, no-cache fresh scoring.
unit.stderr.log: full regression result.
source-scripts/: exact scripts observed for final verification.
