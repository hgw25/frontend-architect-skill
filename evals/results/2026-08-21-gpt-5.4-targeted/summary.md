# Targeted Forward Evaluation

Status: **PASS WITH RECORDED LIMITS**

## Configuration

- Generation and scoring date: 2026-08-21
- Model: `gpt-5.4`
- Reasoning effort: `medium`
- CLI: `codex-cli 0.145.0`
- Cases: the four behaviors changed in this revision
- Conditions: isolated baseline and candidate sessions
- Scoring: separate blind contexts followed by a case-specific failure audit

Raw run metadata is in [manifest.json](manifest.json). Per-dimension reasons and
failure-audit results are in
[blind-scores/scores.json](blind-scores/scores.json).

## Results

| Case | Baseline | Candidate | Delta | Candidate verdict |
| --- | ---: | ---: | ---: | --- |
| `reorder-motion` | 14.67 | 14.67 | 0.00 | target |
| `vue-search-url-i18n` | 16.00 | 15.00 | -1.00 | target |
| `product-list-performance-contract` | 12.57 | 14.86 | +2.29 | target |
| `accessible-dialog-primitive` | 7.20 | 15.20 | +8.00 | target |
| **Average** | **12.61** | **14.93** | **+2.32** | **4/4 target** |

No candidate triggered a case-specific or global failure.

## Executable evidence

- Both Vue conditions passed clean installation, TypeScript checking, and three
  behavior tests covering URL initialization, History restoration, locale
  formatting, and stale-request protection.
- The Dialog baseline failed the real-browser check. The candidate passed clean
  installation, SSR testing, three Playwright browser tests, TypeScript, and the
  production build.
- After this run, both new fixture locks were updated from Vite 7.1.3 to 7.3.6
  to remove the registry-reported high-severity development-server advisories.
  Clean installation, type checks, Dialog SSR/build, and `npm audit` were rerun;
  both locks report zero known vulnerabilities.

## Investigated variance

The Vue candidate scored one point lower on `user_experience` because the blind
scorer noted that it did not add an interactive locale switcher. The request
requires locale to be canonical URL state and does not require such a control.
The candidate still rendered localized messages, plural and currency formats,
and a language attribute, and all declared tests passed. Manual diff review did
not find a reproducible functional regression, so this is retained as sampling
variance rather than converted into another universal Skill rule.

## Limits

Generation and blind scoring used the same model version in separate contexts.
This is useful forward evidence, not independent cross-model proof. Repeat the
high-risk cases with another model family or a human reviewer before treating a
future release decision as fully independent. The performance case is a design
and evidence-contract evaluation; it does not contain a runnable RUM system.
