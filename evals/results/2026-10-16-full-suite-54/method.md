# 54-case frozen comparison — method registered before generation

- Previous: 276-line guide from the preceding installed-matched snapshot (`9808c908a471`).
- Candidate: current 151-line guide, runtime bytes verified against installed snapshot (`23cf3d9a3ade`).
- Both conditions use **all 54 current cases**, the same fixtures, rubric, capture/scoring tools and model (`gpt-5.6-sol`, high). Both explicitly invoke their local guide (`--mode candidate`); previous does **not** mean no-skill baseline.
- All inputs and hashes are archived. Snapshot entrypoints use `.snapshot.md` to avoid creating discoverable extra skills. Global skills, project documents, apps/plugins and multi-agent features are disabled for evaluation calls by the existing runner and recorded wrapper. This is command/read auditing, not proof of OS-level exclusion of every possible read.
- 3 workers; each pair runs previous then candidate. 1,500-second generation limit for both (increased from the earlier study's 900 seconds), 900-second grading limit. Each worker continues after capture/quality failure. Dialog pairs are sequential; the interaction fixture selects an ephemeral port.
- Quality and failure-rule judges are separate fresh contexts. Neither sees the other condition, and neither receives `must_observe`. Score normalization is to 16 across applicable dimensions. The existing thresholds are target >= 13, basic >= 9, otherwise fail; any triggered global/case failure or failed host validation forces fail. Source line count/read volume does not earn quality points.
- Preserve every first attempt. One separate fresh attempt for an invalid capture; one additional fresh pair for a candidate verdict downgrade, new failure or normalized score decline of at least 1.0. Dialog receives a fresh repeat regardless because of its previous variance. A repeat never replaces or votes away the first result. Infrastructure failures and quality failures are reported separately.
- Inspect actual artifacts for deficits. Diagnostic harness or implementation changes occur in separate copies; the unchanged initial verdict remains visible. If a scorer/tool defect requires repair, version it and apply the same evidence view to both conditions, preserving earlier scores.
- This comparison can detect observed differences under explicitly invoked skills. It does not establish automatic routing, statistical equivalence, performance in every environment, production readiness or universal absence of regression.

Each worker uses the fixed previous-then-candidate order; conditions are not counterbalanced. Host load, sandbox behavior and time-dependent service differences therefore remain potential confounders. A single registered repeat per selected case helps expose variability but does not estimate a reliable failure rate or prove causality of guide compression.

See `run-plan.json`, `input-hashes.json`, `installed-runtime-check.json`, `execution/`, and each condition's capture and `blind-scores/` artifacts.

## Auditor repair registered during capture

An observed v7 false invalidation was isolated and corrected in v8: in a successful `&&`-only chain, an **exact** `git diff --check` segment is a no-content check. The exception does not establish a guidance read, and it does not admit failing whitespace checks, patch/content diffs, extra flags, pipes or alternate separators. Three added tests include an actual Git success/failure control; all 80 tool tests pass.

See `audit-repair-protocol.json`. All initial generations continue using unchanged v7 capture prompts, guides, task contracts and model configuration. Raw v7 audits and the already completed v7 scores remain archived. Future obsolete scoring dispatches explicitly defer with exit 75; their progress event does not mean a completed quality score. After capture completion, all raw samples receive the same v8 audit and **fresh uniform grading** under `audit-repair/`. No grade-cache migration or selection by score is used. Registered bounded recovery/repeat decisions use the uniform v8 results. The ordinary content-producing `git diff -- .frontend-architect` command remains outside the recognized read protocol.

## Compatible audit implementation 8.1

The old Dialog recovery reveals a second false invalidation: exact `git diff -- . ':(exclude).frontend-architect'` at the workspace root exposes project changes while explicitly excluding the guide. Implementation 8.1 recognizes only that exact exclusion/cwd combination, without granting guidance-read credit. Three additional tests include an actual Git positive/negative control; **83 auditor tests pass**. Audit data schema stays 8. All **108 initial audit objects and their grading inputs are byte-equivalent**, and scorer/rubric/cases are unchanged, so their canonical grades remain valid without regrading.

The exact same recovery generation receives its first independent grade in `capture-recovery-audit8.1/`; the original 8.0 invalid audit and all raw logs stay preserved. This is not a new model generation or a second quality attempt. Its failed browser check still forces fail. See `audit-8.1-protocol.json` and the raw-evidence hash receipt. Fresh repeats uniformly use implementation 8.1.

The first repeat dispatch mistakenly used a Python interpreter without PyYAML. All 14 calls exited at import before invoking a model. These dispatch logs are retained under `repeats-dispatch-failure/`; the same selected pairs run with the original evaluation venv under `repeats/`. They do not add 14 behavioral samples.
