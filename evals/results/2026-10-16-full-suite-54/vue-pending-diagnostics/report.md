# Vue first-pass pending feedback comparison

Canonical first-pass scores are previous 16/16 and candidate 14/16 (both target). Candidate loses one raw rubric point for user experience and one for verification evidence. The registered >=1 normalized-score decline rule selects a fresh pair; neither initial score is replaced.

A controlled supplementary test mounts each **unchanged** submitted Vue component with the same provided Vue test tooling. It first resolves an old query, submits a new query and holds its response, captures the rendered user-facing state, then resolves the response and verifies the new item appears. Both copies preserve every original source/test/package byte. The added measurement test passes in both conditions; its pass indicates the scenario ran, not that candidate feedback meets the desired quality.

| Measured state while replacement query waits | Previous | Candidate |
| --- | --- | --- |
| Submit text | `Searching…` | `Search` |
| Main busy attribute | `aria-busy=true` | absent |
| Old result remains rendered | yes | yes |
| New result after resolution | yes | yes |

This confirms a concrete pending-feedback omission in the first candidate artifact. It does not show lost request ownership or incorrect final results. Other interaction tradeoffs are not measured by this probe; no browser layout or history-navigation test is claimed.

The verification-score rationale cites missing real-browser refresh/share/history checks. **Both** original implementations were only checked with type checking and jsdom (previous 4 tests, candidate 3); neither ran a real-browser history test. The asymmetry of that part of the score therefore needs cautious interpretation rather than being attributed entirely to guide compression. Initial scores stay unchanged; the fresh paired repeat and actual artifact coverage will be reported separately.

Evidence: [results.json](results.json), [previous log](previous.log), [candidate log](candidate.log), the two hashed input trees, and [recorded probe](probe-file-capture.snapshot.ts). First probe runs returned exit 0 but the reporter omitted their console observations; those logs/results are retained. Only the measurement output changed from console to a JSON file for the second replay; inputs, production source and assertions were unchanged.

Attribution limit: this establishes a difference between these two generated artifacts, not a unique causal effect of shortening the guide. The common async-interaction principle remains in the final guide. Do not fix these frozen submissions or add case-specific guidance during the comparison.


The registered fresh pair is now complete: previous16/current15, bothtarget. Identical interaction replay finds visible pending cues in both, so the first pending omission does not recur in that pair. The remaining numeric deduction concerns verification evidence with a shared real-browser limitation. Full repeat evidence: [fresh-pair replay](../vue-repeat-diagnostics/report.md). First scores and omission remain unchanged.
