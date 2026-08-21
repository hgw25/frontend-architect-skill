# First Forward Evaluation

Status: **PASS**

## Configuration

- Generation date: 2026-08-20
- Scoring and failure-audit refresh: 2026-08-21
- Model: `gpt-5.4`
- Reasoning effort: `medium`
- CLI: `codex-cli 0.145.0`
- Conditions: isolated baseline and candidate sessions for all 12 cases
- Candidate loading: current `SKILL.md` plus only routed references
- Global Skill, plugin, app, and multi-agent discovery: disabled
- Scoring: separate blind sessions; the scorer did not see the other condition or
  case-specific `must_observe` / `fail_if` before assigning rubric scores
- Failure audit: a second anonymous pass saw only each case's `fail_if` and its
  response, diff, and validation evidence; any case-specific or global failure
  overrides the normalized score and forces verdict `fail`

Raw generation metadata is in [manifest.json](manifest.json). Blind scores and
per-dimension reasons are in [blind-scores/scores.json](blind-scores/scores.json).

## Results

| Case | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| `group-by-api` | 14.40 | 14.40 | 0.00 |
| `role-folder-growth` | 13.33 | 13.33 | 0.00 |
| `small-project-structure` | 16.00 | 16.00 | 0.00 |
| `editor-paradigms` | 13.33 | 14.67 | +1.34 |
| `derived-state-effect` | 14.40 | 16.00 | +1.60 |
| `reorder-motion` | 14.67 | 16.00 | +1.33 |
| `server-client-catalog` | 16.00 | 16.00 | 0.00 |
| `unsafe-rich-text` | 16.00 | 16.00 | 0.00 |
| `optimistic-profile-update` | 16.00 | 16.00 | 0.00 |
| `risky-booking-rollout` | 15.00 | 16.00 | +1.00 |
| `accessible-dialog-primitive` | 15.11 | 15.11 | 0.00 |
| `vite-feature-flags-plugin` | 12.80 | 16.00 | +3.20 |
| **Average** | **14.75** | **15.46** | **+0.71** |

All 12 candidate cases reached the 13–16 target band. No candidate case scored
below its baseline. No candidate triggered a case-specific or global failure.
The Vite baseline triggered its case-specific failure because clean installation
failed and it supplied no executable real-host integration evidence; its final
verdict is therefore `fail` despite a normalized score of 12.80.

## Implementation Evidence

### Optimistic profile update

Both final runs passed clean `npm ci`, TypeScript, and three behavior tests. The
candidate validates `response.ok`, treats decoded JSON as `unknown`, rejects an
invalid HTTP 200 response shape, rolls back to the authoritative value, exposes
an accessible retry error, and prevents an older request from replacing the
latest optimistic result.

Evidence:

- [candidate diff](optimistic-profile-update/candidate/changes.diff)
- [candidate check log](optimistic-profile-update/candidate/validation-2.log)

### Vite feature-flags plugin

The baseline produced an invalid workspace dependency and failed clean install,
so the implementation could not be verified. The candidate passed clean install
and the full fixture check:

- plugin package build and declaration output;
- consumer TypeScript checking;
- real Vite production build;
- real dev-server module loading and HMR invalidation;
- actionable invalid-configuration diagnostics;
- packed-artifact content checks;
- client allowlist verification excluding the server-token fixture value.

Evidence:

- [candidate diff](vite-feature-flags-plugin/candidate/changes.diff)
- [candidate check log](vite-feature-flags-plugin/candidate/validation-2.log)
- [baseline install failure](vite-feature-flags-plugin/baseline/validation-1.log)

## Failure Audit

After blind scoring, the evaluation script ran a separate failure-only audit for
both conditions using the response, actual diff, and validation logs. The audit
records the exact triggered rule and evidence reason, rejects invented rules,
and forces verdict `fail` whenever a case-specific or global failure exists. No
final candidate triggered either kind of failure.

The audit caught one earlier optimistic-update candidate that cast decoded JSON
directly to `Profile`. The fixture was strengthened with an invalid-success-
response test and both conditions were rerun before recording the final scores.

## Interpretation and Limits

This evaluation demonstrates improvement for this fixed model, CLI, date, and
case set. It does not prove that every future model run will be identical. Repeat
the forward suite when changing the Skill's behavior, the fixtures, the model,
or the execution environment. Keep failed runs and validation limitations as
evidence rather than replacing them with self-reported success.
