# Verification and Review

Use the relevant sections for a requested review, an unresolved verification
decision, causal investigation, performance evidence or a lasting acceptance
claim. An ordinary proportionate check does not require loading this reference.

## Contents

- [Verify risk, not ceremony](#verify-risk-not-ceremony)
- [Keep test organization predictable](#keep-test-organization-predictable)
- [Test observable contracts](#test-observable-contracts)
- [Distinguish cause from recovery](#distinguish-cause-from-recovery)
- [Establish review scope and coverage](#establish-review-scope-and-coverage)
- [Review architecture and implementation](#review-architecture-and-implementation)
- [Review interfaces](#review-interfaces)
- [Check adversarial boundaries](#check-adversarial-boundaries)
- [Validate performance claims](#validate-performance-claims)
- [Keep evidence reproducible](#keep-evidence-reproducible)
- [Report findings and evidence](#report-findings-and-evidence)
- [Influences](#influences)

## Verify risk, not ceremony

Choose checks based on what could fail:

| Change | Useful evidence |
| --- | --- |
| Pure transformation | focused unit cases, types, boundary values |
| Component interaction | browser/component test through user-visible controls |
| Cross-module flow | integration test across the real boundary |
| Critical journey | small number of high-value end-to-end paths |
| Styling/layout | representative viewport and content inspection |
| Accessibility behavior | keyboard/focus test plus automated checks where useful |
| Animation | reduced-motion path, interruption test, rendering profile |
| Performance work | before/after measurement on representative conditions |
| Refactor | existing contract tests plus affected-flow verification |

Run project-prescribed checks. If the full suite is disproportionate or cannot
run, execute the strongest relevant subset and state what remains unverified.
Passing tools does not substitute for reasoning about missing behavior.

Use a real browser when claiming browser behavior: focus movement, keyboard
event ordering, hydration, layout, scrolling, pointer interaction, and visual
output are not proven by a DOM emulator alone. Select a browser matrix from the
supported contract and risk; do not run every browser for every local change.
For visual snapshots, pin browser, fonts, viewport, locale, timezone, animations,
and data so environmental variance is not mistaken for a product regression.

Exercise the claimed control and condition; a disabled button elsewhere or a
passing test count does not establish coverage. For a connected interaction,
trace a representative action through pending work, accepted data, visible
feedback and failure/retry. Cover the relevant variant that can break that
connection: cold or delayed content, layout settling, a different viewport,
or repeated input during completion. A control mounting is not proof that it
became usable or that its whole visible region participated.

For layout, inspect actual available content space, overlap, clipping and scroll
reachability; hiding an icon is not evidence that text recovered its space.
For hover/focus, use real hit testing and focus movement. Include return and
interruption when measurements can become stale. Select variants by changed
policy and failure risk, not every control/platform combination. Small spacing
edits need proportionate inspection, not a new framework or full application suite.

## Keep test organization predictable

Honor the user's preferred test layout and existing project/runner conventions.
Both colocated tests and a dedicated `tests/` tree can work; choose consistently
for comparable tests. Different placement for unit and end-to-end suites is
reasonable when their runner or scope explains it. Do not scatter new tests by
convenience or force colocation against an explicit centralization preference.

Within a centralized tree, group by the protected feature or contract so tests
remain easy to map back to source. Keep setup and fixtures at their actual reuse
scope, not in a generic dumping ground. When relocating tests, update imports,
runner discovery and setup paths, and verify the intended cases still execute;
passing an accidentally empty or reduced suite is not migration evidence.

## Test observable contracts

Test through the interface used by the code's real consumers:

- End users consume rendered content, semantics, focus, navigation, feedback,
  and completed actions.
- Developer consumers use exported functions, component inputs, events, and
  documented contracts.

Avoid tests coupled to private state, internal component names, incidental DOM
structure, lifecycle calls, or implementation-only helpers unless those details
are themselves contractual.

Prioritize:

1. A failure that would materially harm the user or business.
2. A regression that is plausible given the change.
3. Boundary and transition behavior that static analysis cannot prove.
4. Complex pure logic that benefits from fast exhaustive cases.

Do not pursue coverage percentages as the primary objective. Prefer fewer tests
that detect meaningful breakage and remain valid through safe refactoring.

For a defect, establish that the decisive check fails under the original
conditions and passes after the fix when a safe comparison is feasible. Do not
weaken the check to match the implementation. If the harness is wrong, correct
it while retaining the original acceptance condition and explain the evidence.
Distinguish tests actually selected by a command from the intended subset.

## Distinguish cause from recovery

For a state that fails to converge, trace the authoritative event or response
through decoding, identity association, persistence and the consumer transition,
using only the boundaries that exist. Find where the expected fact stops being
applied; compare a known-good path or a controlled event order when useful.
Prefer a check through that main path with incidental recovery disabled or
unavailable. If the original conditions fail and the same check passes after a
local correction, that supports the demonstrated mechanism. It does not prove
the cause of an earlier incident whose event history is missing.

Reconciliation, retry and polling can be necessary for documented signal loss
or uncertain outcomes. Verify that recovery separately, including ownership and
termination; its success alone does not justify adding a new background system
or replacing an established abstraction. Use existing guarantees first. Withdraw
experiments that the evidence rejects, preserving shared recovery still needed
by other paths. If decisive reproduction is unavailable, report the remaining
hypotheses and continue independent authorized work without claiming a fix.

## Establish review scope and coverage

For a requested review, establish two complementary views before drawing a
conclusion: what the change is required to do, and what the changed code actually
does. Keep this lightweight for a local edit; use the supplied request as its
contract when sufficient. Do not edit the implementation unless requested.

- Establish the comparison baseline or supplied snapshot and inventory the
  changed files and behaviors. Follow affected consumers and shared policies
  beyond diff hunks when needed. Choose depth from change and risk; familiarity,
  authorship, or an earlier passing check is not a reason to skip changed behavior.
- Identify authoritative requirements from the request, applicable spec and
  accepted revisions, alongside repository contracts. Walk each applicable
  requirement in scope to its implementation and supporting evidence, including
  omissions that have no diff hunk. Distinguish implemented, missing or partial,
  and unresolved requirements. Cite the source for a claimed requirement mismatch;
  flag conflicting or unavailable requirements instead of inferring intent from
  the implementation. Continue checks that do not depend on the missing source.
- Inspect changed behavior for correctness and maintainability independently of
  requirement matching. Trace shared rules through affected entry points and
  meaningful branches; include local controls and boundary states when a
  page-level check cannot expose their failures. Use the questions below and load
  further guidance only for concrete unresolved decisions.
- Track which requirements and affected paths were inspected and which remain
  unchecked. If sampling is necessary, report the omitted behavior categories
  and resulting uncertainty, not only file or line counts. Distinguish code
  inspection from executed checks; a clean sample is not a whole-change verdict.

Keep this working coverage account in review notes or existing project artifacts;
a separate document, exhaustive report of passing items, or fixed team structure
is not required. Respect an explicitly limited review scope and name its limits.

## Review architecture and implementation

Review the changed system, not isolated clever lines. Ask:

- Does the implementation satisfy the stated outcome?
- Is there a simpler platform or project-native capability?
- Is each fact owned once, or are state and caches duplicated?
- Are dependencies and side effects pointing in a clear direction?
- Do functions, components and modules have coherent responsibilities? Can an
  operation's callers understand its inputs, outcome and effects without knowing
  a private preparation sequence or mutable context fields?
- Is a new abstraction supported by stable common semantics?
- Has convenience added overload, configuration, or generic complexity?
- Are errors, cancellation, races, retries, and cleanup handled where relevant?
- Do types match runtime behavior and external trust boundaries?
- Did the change unintentionally widen a public contract?
- Is unrelated cleanup mixed into the diff?
- Do paths implementing the same rule agree, such as which fields are visible,
  validated, and submitted, or which identity is routed and fetched?
- After a requirement was removed, which remaining mechanisms still serve a
  concrete consumer or behavior?

Treat code clarity as the time required for a future maintainer to predict the
effect of a change. Shorter code is not automatically clearer; more layers are
not automatically more architectural.

For code-quality claims, follow important changed operations through their real
callers and callees. Use [readable operation construction](architecture-and-code.md#construct-a-readable-operation)
when the function body or call contract is unclear. Ground a maintenance finding
in the rule, ordering or internal detail that callers must understand, or a
realistic change that spreads into unrelated responsibilities. Distinguish this
from a correctness bug; a different loop style or several purposeful private
helpers alone is not a finding.

For architecture claims, inspect the actual tree, imports and state owners,
not just a proposed diagram or passing functional tests. Trace a realistic UI
interaction change and, where applicable, an independent data-format change:
identify expected edit locations, then check whether unrelated responsibilities
must change, rules are copied, or consumers need internal details. File counts
alone are not a verdict. Fix concrete boundary problems before claiming the
structure is maintainable. Independent handoff can strengthen the evidence;
functional success alone does not prove architecture quality or skill improvement.

## Review interfaces

Apply the journey and layout checks above to relevant loading, empty, partial,
error, permission, success and retry states. Inspect semantics, labels and
announcements; keyboard navigation, focus visibility/trapping/restoration; touch
targets; narrow/wide screens, zoom, long text and localization. Include visual
consistency, reduced motion and interruption where those policies changed.

Automated accessibility tools catch only part of the problem. Exercise the
interaction model directly for complex controls.

## Check adversarial boundaries

Use adversarial cases that arise from the language, platform, or domain. Do not
invent an unlimited defensive-programming burden.

Examples:

- empty and single-item inputs;
- missing, null, zero, false, and empty-string values when semantically distinct;
- duplicate IDs or keys;
- `constructor`, `toString`, and `__proto__` in object-keyed accumulators;
- out-of-order async completion and navigation during a request;
- rapid repeated submission or interaction;
- stale closures and cleanup after unmount;
- timezone, locale, Unicode, and long content when the feature handles them;
- object identity versus string coercion for maps and caches;
- aborted animation, resize, or input during transition.

Add a regression test when an adversarial case is both plausible and costly, or
when the implementation has already failed there.

## Validate performance claims

Audit performance work against this evidence chain:

1. Define the user-visible symptom and target metric.
2. Record a representative baseline.
3. Identify the actual bottleneck with appropriate profiling.
4. Change the smallest responsible part.
5. Repeat the same measurement and compare tradeoffs.

Check that the evidence matches the claimed runtime and user path. Do not accept
render counts, one synthetic score, a simulator, or a microbenchmark as proof of
production impact. Use the rendering or runtime reference only when the review
needs its platform or delivery model.

For new shared interaction work, inspect preparation and steady-state work at
the supported collection size before calling it complete, even when the task
was not phrased as performance optimization. Repeated layout reads, per-cell
effects, cloning and idle subscriptions can dominate before animation starts.
Use representative measurements to choose a small workload boundary; reuse
existing performance checks. A deterministic work-count check can protect that
boundary without turning a noisy timing sample into a universal CI threshold.

## Keep evidence reproducible

Persist evidence when it supports a lasting acceptance, performance or release
claim. Use the existing verification record and artifact storage; do not create
a new archive process for every edit. Record the tested revision or dirty-tree
snapshot, relevant runtime/Skill inputs, exact commands and selected checks,
representative conditions, actual results and unresolved limits.

Keep the decisive raw sample or a retrievable artifact reference with the record,
using a checksum when identity could otherwise be confused. A temporary path,
ignored build directory or summary table alone is not durable evidence. Retain
only useful, appropriately redacted material; full traces need not enter Git.
If originals are missing or another task changed the files, distinguish historical
claims from fresh verification and bind new results to the tested snapshot.
Do not silently promote repaired/repeated runs to first-attempt success.

## Report findings and evidence

For code review:

1. Report concrete, actionable findings first, ordered by severity.
2. Identify the affected behavior and conditions that trigger it.
3. Cite the tightest relevant file and line when available.
4. Distinguish correctness defects, evidenced requirement mismatches, and
   maintainability suggestions; do not count heuristics as confirmed bugs.
5. Say explicitly when no actionable defect was found, while noting residual
   testing or environment gaps. Summarize the reviewed scope, requirement sources,
   and concrete unchecked behaviors; limit the conclusion to that evidence.

For completed implementation:

- state the outcome;
- identify the important design decision and why it fit;
- list meaningful checks performed and their result;
- disclose checks not run or risks not resolved;
- avoid narrating every command or claiming certainty beyond the evidence.

## Influences

- Kent C. Dodds,
  [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details):
  tests should resemble how real consumers use the software.
- Kent C. Dodds,
  [How to Know What to Test](https://kentcdodds.com/blog/how-to-know-what-to-test):
  prioritize important use cases and observable effects.
- web.dev, [RAIL](https://web.dev/articles/rail): user-centered performance
  budgets for response, animation, idle, and load.
- Playwright, [Emulation](https://playwright.dev/docs/emulation) and
  [Visual comparisons](https://playwright.dev/docs/test-snapshots): control
  browser conditions and compare rendering in a consistent environment.
- Heydon Pickering,
  [Inclusive Components](https://inclusive-components.design/): review complete
  interaction patterns, not isolated ARIA attributes.
