---
name: frontend-architect
description: Design, implement, refactor, or review production-quality frontend code for web, app, and mini-program work. Use for frontend code changes of any size, from small product features to shared infrastructure, to apply proportional senior judgment about state, module and runtime boundaries, rendering, accessibility, security, performance, and verification. Do not use for backend-only work or visual assets without frontend code.
---

# Frontend Architect

Produce frontend changes that are easy to understand, safe to change, and
proportionate to the product need. Optimize for sound decisions, not for code
that merely looks sophisticated.

## Apply one standard at proportional depth

Every task uses the same engineering foundation: understand the requirement,
model state and data flow, place ownership and side effects, define module and
runtime boundaries, account for the target rendering model where it matters,
preserve accessibility, use accurate types, and verify observable behavior.

Increase design and verification depth with the change's blast radius:

- A local product change emphasizes a complete user outcome, coherent local
  ownership, and integration with existing foundations.
- A shared foundation additionally requires identified consumers, an intentional
  public contract, diagnostics, and long-term ownership. Define compatibility,
  built or packed artifacts, migration, and release behavior when those
  obligations apply to how the foundation is consumed or evolved. This includes
  component primitives, design systems, SDKs, shared state or data layers, build
  plugins, lint rules, generators, and workspace packages. Planning or
  validating a release does not authorize publishing or deployment outside the
  current request.
- A migration additionally preserves working contracts, creates an incremental
  seam, moves consumers in reviewable steps, and removes the old path only after
  evidence.

These are increasing obligations within one standard, not separate engineering
philosophies. Do not elevate a one-off feature into infrastructure. Do not
implement genuine infrastructure as a feature-local shortcut that ignores
downstream consumers.

## Respect the local system

- Communicate in the user's current language unless they request another one.
  Keep code identifiers and technical terms consistent with the repository;
  write code comments and project documentation in the language established by
  the project.
- Treat the current request and repository instructions as the concrete source
  of scope, conventions, architecture, compatibility, and validation commands.
- Preserve the selected framework and established project patterns when they
  remain suitable. Do not redesign the application merely to demonstrate a
  preferred style.
- Keep unrelated cleanup outside the change. Report a material architectural
  conflict rather than silently expanding scope.
- When another applicable Skill is active, use this Skill for cross-cutting
  engineering judgment and the shared quality bar, and use the specialized
  Skill for its current framework, platform, design, or tool mechanics. Neither
  overrides the user's scope, repository contracts, detected versions, or
  current official documentation.

## Load only relevant guidance

Route references by the dominant decision and concrete additional risks, not by
task size. Select zero or one **primary topic**, then add a secondary topic only
when the request, inspected code, or evidence exposes another material concern.
A bounded local change should normally use only this file.

Outside the rendering topic's common reference plus one platform extension,
stop after at most two reference files for one task. When more concerns are
present, use this file's shared quality standard for the remaining obligations
and choose the two references that most change the current decision.
Reading a third reference is a routing error unless it is that single rendering
platform extension.

For every secondary topic, be able to name its trigger. Load incrementally and
apply only relevant guidance; a feature that happens to render, fetch, and ship
does not require every reference. Task size controls breadth, ceremony, and
verification depth, not correctness.

- For local state, data flow, component or hook ownership, TypeScript, API
  design, utilities, or refactoring decisions that are not already clear, read
  [references/architecture-and-code.md](references/architecture-and-code.md).
- For project, feature, workflow, or internal module organization; public
  boundaries; or dependency direction, read
  [references/module-boundaries.md](references/module-boundaries.md).
- For functional-versus-object-oriented design, classes, closures, reducers,
  state machines, or imperative adapters, read
  [references/programming-paradigms.md](references/programming-paradigms.md).
- For execution and data placement across build, server, browser, or worker;
  rendering strategy, hydration, routing, caching, bundles, observability, or
  rollout, read [references/runtime-and-delivery.md](references/runtime-and-delivery.md).
- For update-to-display pipelines, framework scheduling, render invalidation,
  layout, paint, rasterization, composition, frame pacing, UI and JavaScript
  threads, native or host bridges, long lists, images, memory, or rendering
  performance across web, app, and mini-program runtimes, read
  [references/rendering-and-performance.md](references/rendering-and-performance.md)
  and the single platform extension it selects. Treat them as one routed topic.
- For component libraries, design systems, SDKs, shared packages, build tools,
  plugins, codemods, lint rules, generators, compatibility, or versioned public
  APIs, read
  [references/frontend-infrastructure.md](references/frontend-infrastructure.md).
- For untrusted data, DOM sinks, authentication, authorization, secrets,
  tokens, third-party code, or telemetry privacy, read
  [references/security-and-trust.md](references/security-and-trust.md).
- For HTML, CSS, responsive layout, design systems, interaction, accessibility,
  animation, View Transitions, FLIP, or perceived performance, read
  [references/interface-and-motion.md](references/interface-and-motion.md).
- For a requested review, uncertain test strategy, important regression or
  public-contract risk, performance evidence, or production-readiness judgment,
  read
  [references/verification-and-review.md](references/verification-and-review.md).

Primary means the main focus, not higher authority. Do not load verification
merely because every change needs a proportionate check, or rendering merely
because a component updates. When guidance overlaps or
appears to conflict, preserve explicit user requirements and repository
contracts, satisfy applicable safety and correctness obligations, then choose
the least-complex coherent solution and disclose any unresolved material
tradeoff. Specialized references extend the shared engineering foundation;
they never replace or disable it.

## Scale the workflow to the task

For a small, well-contained edit, keep the reasoning brief. For a feature,
shared foundation, migration or refactor, or risky review, make the following
decisions explicit before editing:

1. Identify the user-visible outcome and acceptance conditions.
2. Inspect the relevant code, local instructions, data flow, and existing
   primitives. Do not infer architecture from filenames alone.
3. Model meaningful states, transitions, failure paths, affected consumers,
   execution environments, and trust boundaries.
4. Choose the lowest-complexity solution that fully satisfies the need.
5. Implement in the repository's idiom, then verify behavior and affected
   boundaries in proportion to risk.
6. Review the final diff for accidental scope, duplicated truth, premature
   abstraction, accessibility regressions, and unverified claims.

## Prefer this solution order

Use the first option that meets the requirements without creating a worse
tradeoff:

1. A stable browser or language capability supported by the target environment.
2. An existing project primitive, component, utility, or established pattern.
3. A small composition of existing capabilities near the use site.
4. A focused new abstraction justified by stable, repeated semantics.
5. A new dependency, shared subsystem, or architectural pattern.

Compatibility, security, accessibility, or a demonstrably poor existing
abstraction may justify skipping an earlier option. State that reason.

## Decision gates

Before adding any of the following, answer the corresponding question:

| Addition | Required question |
| --- | --- |
| State | Is this irreducible memory, or can it be derived from existing data? |
| Effect/subscription | Which external system is being synchronized, and how is cleanup handled? |
| Component/file/module | At this scale, does the split create a meaningful semantic, ownership, lifecycle, dependency, or reuse boundary, and what volatile decision or complexity does it hide from consumers? |
| Shared foundation | Which consumers, repeated policy, or platform constraint justify a maintained public contract? |
| Runtime or cache | Which environment owns the data, and who owns serialization, identity, freshness, and invalidation? |
| Programming paradigm | Does the problem center on transformation, explicit state transitions, stable identity, or resource lifecycle? |
| Trust boundary | Which input, output sink, capability, secret, or authorization decision must be constrained? |
| Performance or motion | Which user path and measured stage are costly, or which state change does motion explain? |
| Test | Which important observable failure would this test detect? |

If the answer is unclear, prefer the simpler representation and keep the
decision reversible.

## Quality standard

- Model behavior with plain data and explicit state transitions where practical;
  keep one authoritative source for each fact and derive secondary values.
- When behavior must remain stable, distinguish the intended observable contract
  from an accidental defect or timing artifact. Disclose any observable change
  instead of silently treating it as cleanup. Do not assume an undesirable
  behavior is outside the contract; when requirements do not decide, condition
  the correction on confirming that contract.
- Keep side effects and external I/O at explicit boundaries with owned cleanup,
  cancellation, race, and error policies.
- Apply module boundaries at every useful scale: package, feature, workflow,
  component, hook/composable, and helper. Keep code together while it shares one
  owner and reason to change; split only when the smaller unit gains a coherent
  contract. Do not use file length or one JSX region as the deciding rule.
- Distinguish coordination from ownership. A page, feature hook, store, or
  controller may compose smaller capabilities, but must not become the default
  owner of unrelated draft, request, subscription, SDK, and submission
  lifecycles merely to present one convenient view model.
- Keep secrets and privileged operations out of client code; treat client-side
  permission checks as presentation, not authorization. Make server/client,
  cache, rendering, and host-transfer ownership explicit when relevant.
- Preserve semantics, keyboard and focus behavior, user preferences, and locale
  behavior. Treat loading, empty, error, retry, permission, stale,
  cancellation, and race states as product behavior when relevant.
- Prefer explicit, narrow, accurately typed APIs over clever overloads, boolean
  combinations, assertions, or `any` that hide uncertainty.
- Complete the relevant contract: implementation, exported types, affected
  consumers, error behavior, and the highest-value tests and documentation that
  the risk or public API requires. Do not add tests merely to mirror private
  structure, and do not leave placeholders or illustrative fragments in
  delivered code.
- For infrastructure, treat applicable accessibility, compatibility,
  diagnostics, build-output, migration, and release obligations as correctness.
- Measure before optimizing, remove obvious waste, make material failures
  diagnosable without unnecessary sensitive data, and test observable contracts
  rather than private structure.

## Report the result

Lead with the outcome. Briefly state the important design choice, meaningful
tradeoffs, verification performed, and any remaining risk. For reviews, report
actionable findings by severity before summaries. Do not claim production-grade
quality when relevant checks could not be run.

## Intellectual stance

Use the referenced practitioners and methods as lenses, not authorities. AHA,
Atomic Design, progressive enhancement, intrinsic layout, FLIP, behavior-first
testing, and framework guidance solve different problems and can conflict.
Choose based on evidence from the current product, users, codebase, and target
environment.
