# Team-invitation fixture calibration

This is input/oracle preparation, not a skill behavior result. No LLM generation was run by this task.

Raw request: `完成团队邀请页的发送与列表操作。`

The generator receives only `evals/fixtures/live-invites`, the request and the assigned skill. The oracle and temporary reference implementation are not generator input. The fixture uses native ESM and the existing narrow HTTP transport; the browser exercises real DOM behavior with a fake HTTP service, not real email delivery.

Public command: `npm ci --ignore-scripts` followed by `npm run check`.

For host-only verification, clone a completed generated workspace without changing its sources, copy `evals/oracles/invites-behavior.spec.mjs` to that clone's `tests/host-invites.spec.mjs`, then run `npm run check`. Do not copy the oracle before generation.

Final calibration on Node 22.22.2, Playwright 1.62.1, Chromium 151.0.7922.34:

- Seed: all 3 public checks pass; all 4 hidden checks fail. The confirmed send is reported as failed after an overview error; keyboard reorder drops actual focus; send completion takes focus from the user's note edit. Raw failures remain in `seed-semantic-locators.log` and `seed-final-results.json`.
- Independent temporary reasonable implementation: all 7 checks pass. It is saved in `reference-app.mjs` and the full isolated source in `reference-final-source/`; neither enters the generation fixture. Raw log is `reference-semantic-locators.log`.
- Controlled replay mutant of the passing reference: the overview-retry test fails specifically on 2 sends instead of 1. `replay-mutant.log` and `replay-mutant-app.mjs` preserve this additional negative control.

The initial calibration used a single status locator. Final public and hidden locators allow distinct send and overview status regions, so a legitimate split does not fail merely by having multiple live regions. Both positive and negative implementations were rerun against these final selectors. Initial logs/results remain separately saved; final checks are identified by `-final-` and the semantic-locators logs.

`fixture-hashes-final.json` records the final generation input bytes. `calibration.json` records final test stats, individual outcomes, oracle hash and port cleanup. All three final Playwright server ports reject connections after completion. The full raw test artifacts include screenshots and traces for reproducible failures.

Suggested protected input: package manifest/lock, Playwright configuration, server script, initial data, transport and public tests. `.gitignore` excludes node_modules and browser reports. The README documents product/transport contracts and may remain editable for context discovery, but accepted product behavior stays fixed.
