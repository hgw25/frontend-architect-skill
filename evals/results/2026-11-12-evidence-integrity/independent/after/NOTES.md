Independent after-fix verification, 2026-11-12

The original before-fix probe.py, guidance_probe.py, report.json and guidance-report.json remain unchanged in the parent directory. The two after scripts only change their BASE directory to /tmp/fa-integrity-independent-20261112/after to preserve the original evidence and avoid existing-directory collisions. No business steps or scorer stub behavior changed. No external model was called. Repository files were read only.

Commands

PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/after/probe.py > /tmp/fa-integrity-independent-20261112/after/probe.stdout.log 2> /tmp/fa-integrity-independent-20261112/after/probe.stderr.log
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/after/guidance_probe.py > /tmp/fa-integrity-independent-20261112/after/guidance.stdout.log 2> /tmp/fa-integrity-independent-20261112/after/guidance.stderr.log
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/after/archive_rescore.py > /tmp/fa-integrity-independent-20261112/after/archive.stdout.log 2> /tmp/fa-integrity-independent-20261112/after/archive.stderr.log
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/Users/heguangwei/project/skills/frontend-architect-skill/scripts /tmp/fa-integrity-independent-20261112/venv/bin/python -m unittest discover -s scripts -p 'test_*.py' > /tmp/fa-integrity-independent-20261112/after/unit.stdout.log 2> /tmp/fa-integrity-independent-20261112/after/unit.stderr.log

Results

- Direct product edit and two-round host repair pass. Repair captures actual first-round failure and second-round success, with state=1 in the final project snapshot.
- After workspace removal, cached scoring still passes. Additional archive_rescore.py removes blind-scores entirely and successfully obtains a fresh target through two local scorer calls without the workspace.
- Single-file mutations of top-level response.md / changes.diff / validation-2.log now reject before scorer calls, replacing cached target with invalid. Existing attempts/0 response and guidance-integrity mutations still reject.
- Removing one guidance round summary, conflicting per-attempt guidance metadata, deleting attempts, or changing the manifest guidance source identity now reject before scorer calls.
- Existing original tamper-attempt-summary probe still passes: changing only attempts[0].validations[-1].exit_code from 1 to 0 in manifest.json is not checked against preserved evidence and both scorers receive altered round metadata. No raw log or digest was changed. Reported to parent for scope decision.
- Full regression: 126 tests, OK.
