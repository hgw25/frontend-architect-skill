# Vue registered fresh-pair replay

Fresh repeat grades are **previous 16/16, candidate 15/16, both target**. Neither replaces the first 16→14 result. The only new score deduction is verification evidence; both fresh outputs still rely on type checks and jsdom (previous 4 tests, candidate 3), with no real-browser history/navigation check. The grader gives previous full verification points while naming that same browser limitation. Record the score and the asymmetry rather than treating all of the numeric difference as demonstrated behavioral regression. Actual test-source inspection also finds a substantive coverage difference: previous adds locale/page changes while preserving an unsubmitted draft, checks document language after URL/history restoration, and enables component auto-unmount. Candidate retains the three fixture tests. That additional coverage has value; test count alone is not the criterion, and the one-point evidence difference is not dismissed as pure grading noise. Both source trees are archived in this diagnostic’s inputs.

The same resolved-old-query → submit-new-query → hold-response → resolve-new-response scenario is replayed against **unchanged** copies. Both diagnostic commands succeed and every archived production/test/package byte remains unchanged:

| Waiting state | Previous repeat | Candidate repeat |
| --- | --- | --- |
| Visible pending feedback | Searching… | Searching… |
| Feedback semantics | role=status on pending paragraph | aria-busy=true and aria-live=polite on results section |
| Prior results while pending | cleared | retained with pending indicator |
| New result after response | rendered | rendered |

The initial candidate’s missing pending cue does **not recur in this single repeat**. This does not erase the confirmed initial omission or establish a reliable failure rate. It also does not prove screen-reader behavior, layout, real-browser navigation or other unexecuted paths.

[Results and input hashes](results.json), [previous replay](previous.log), [candidate replay](candidate.log), [probe](probe-regions.snapshot.ts). The first observation already captured both visible messages but recorded attributes only on main. Because the candidate puts them on section, an additional observation captured all busy/live regions without changing source, scenario or assertions; the first logs, probe and results remain archived. A particular button label or attribute placement is not required for quality.
