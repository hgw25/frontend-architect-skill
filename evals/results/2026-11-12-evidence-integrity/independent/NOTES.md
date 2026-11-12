Independent read-only capture/scoring verification, 2026-11-12

Repository: /Users/heguangwei/project/skills/frontend-architect-skill
No external model service was used. The capture subprocess was an actual local Python generator; scoring used run_score output stubs. Fixture checks were actual local subprocesses. All generated probe sources, result directories, archived evidence and logs are under this directory. Both generated workspaces were deleted after initial scoring.

Commands executed

python3 -m venv /tmp/fa-integrity-independent-20261112/venv
/tmp/fa-integrity-independent-20261112/venv/bin/python -m pip install -r /Users/heguangwei/project/skills/frontend-architect-skill/requirements-dev.txt
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/probe.py > /tmp/fa-integrity-independent-20261112/probe.stdout.log 2> /tmp/fa-integrity-independent-20261112/probe.stderr.log
PYTHONDONTWRITEBYTECODE=1 /tmp/fa-integrity-independent-20261112/venv/bin/python /tmp/fa-integrity-independent-20261112/guidance_probe.py > /tmp/fa-integrity-independent-20261112/guidance.stdout.log 2> /tmp/fa-integrity-independent-20261112/guidance.stderr.log

Observed before the parent agent's fix

- Product state 0→1 in one attempt: capture passed; first score used two local scorer calls; repeated and archived scoring reused cache with zero calls.
- Host-feedback repair: two real attempts; first state check failed, second passed; final frozen project contained state=1. Capture and scoring passed. Both original guidance-integrity.json records remain available despite deleted workspaces.
- Ordinary single-file edit to top-level response.md, changes.diff or validation-2.log: no manifest or digest change; evidence preflight returned []; both local scorers were invoked with altered content and target was returned. This is the reproducible integrity gap.
- Single-file edit to attempts/0/response.md or attempts/0/guidance-integrity.json: invalid, zero scorer calls, original target revoked. Existing attempt artifact hashing works.
- Single manifest edits to duplicate per-round metadata: removal of one record.guidance_checks round, a conflicting attempts[0].guidance_checks after hash, or removal of attempts are not rejected; two scorer calls follow. Removing CONTRIBUTING.md from manifest.guidance_sha256 reuses cached target. These do not alter raw evidence or digest stamps; they demonstrate missing cross-field consistency checks, not a request for cryptographic signing.

Artifacts

report.json / probe.stdout.log: primary before-fix results.
guidance-report.json / guidance.stdout.log: per-round identity consistency results.
direct/ and repair/: original local capture results and scoring caches, workspaces cleaned.
tamper-* / guidance-*: isolated single-mutation copies with manifests and raw evidence preserved.
before/: script copies observed before fix.
unit.stderr.log: 95-test run while parent was adding RED cases; four expected top-level-artifact failures, so this concurrent run is not a final suite result.
