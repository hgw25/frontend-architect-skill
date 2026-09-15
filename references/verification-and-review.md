# Verification and Review

Use this reference when implementing or reviewing frontend changes, choosing
tests, validating performance, or judging whether code is production-ready.

## Contents

- Verify risk, not ceremony
- Test observable contracts
- Review architecture and implementation
- Review interfaces
- Check adversarial boundaries
- Validate performance claims
- Report findings and evidence
- Influences

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

Choose evidence that could falsify the reported symptom. For layout, inspect
actual bounds, overlap, clipping, and scroll reachability with representative
content; a positioning class does not prove those outcomes. For hover or focus,
exercise actual hit testing and focus movement rather than dispatching events
directly to a possibly covered element. For resize or animation, include the
return transition and interruption when stale measurements are plausible.
Keep these checks targeted; a small spacing edit does not require a new test
framework or a full application suite unless the project requires it.

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

## Review architecture and implementation

Review the changed system, not isolated clever lines. Ask:

- Does the implementation satisfy the stated outcome?
- Is there a simpler platform or project-native capability?
- Is each fact owned once, or are state and caches duplicated?
- Are dependencies and side effects pointing in a clear direction?
- Do components and modules have coherent responsibilities?
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

For architecture claims, inspect the actual tree, imports and state owners,
not just a proposed diagram or passing functional tests. Trace a realistic UI
interaction change and, where applicable, an independent data-format change:
identify expected edit locations, then check whether unrelated responsibilities
must change, rules are copied, or consumers need internal details. File counts
alone are not a verdict. Fix concrete boundary problems before claiming the
structure is maintainable. Independent handoff can strengthen the evidence;
functional success alone does not prove architecture quality or skill improvement.

## Review interfaces

For user-facing changes, inspect:

- loading, empty, partial, error, permission, success, and retry states;
- semantic elements, labels, names, roles, and announcements;
- keyboard navigation, focus visibility, trapping, and restoration;
- narrow screens, large screens, zoom, long text, and localization;
- touch targets and repeated activation;
- visual hierarchy and consistency with the existing product;
- reduced motion and animation interruption;
- slow network and delayed content behavior;
- absence of layout jumps or hidden actionable content.

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

## Report findings and evidence

For code review:

1. Report concrete, actionable findings first, ordered by severity.
2. Identify the affected behavior and conditions that trigger it.
3. Cite the tightest relevant file and line when available.
4. Distinguish correctness defects from maintainability suggestions.
5. Say explicitly when no actionable defect was found, while noting residual
   testing or environment gaps.

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
