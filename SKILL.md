---
name: frontend-architect
description: Design, implement, refactor, or review production-quality frontend code for web, app, and mini-program work. Use for frontend code changes of any size, from small product features to shared infrastructure, to apply proportional senior judgment about state, module and runtime boundaries, rendering, accessibility, security, performance, and verification. Do not use for backend-only work or visual assets without frontend code.
---

# Frontend Architect

Produce frontend changes that are easy to understand, safe to change, and
proportionate to the product need. Optimize for sound decisions, not for code
that merely looks sophisticated.

## Maintainable engineering defaults

These defaults are self-contained; no personal configuration or companion skill
is required. Apply them to code, configuration, scripts and engineering operations
within the task's scope:

- Inspect existing contracts and workflows; reuse project capabilities, standard
  tools and suitable maintained solutions before creating custom mechanisms.
- Optimize for the next maintainer's understanding and ability to change the
  system. Keep the execution path visible; fewer lines or more layers alone do
  not establish simplicity. Avoiding overengineering does not excuse omitting
  necessary architecture or leaving business interactions in a scaffold entry.
- Anticipate likely changes before implementation, including common domain
  changes without a committed roadmap. Use clear ownership, modest extension
  points and convenient APIs where they lower change or caller cost; implement
  full general-purpose machinery only with stronger evidence of need. If the
  predicted change never happens, the design should still earn its cost through
  today's clarity or usability; otherwise keep the change easy to add later.
- Before delivery, revisit a realistic likely change: can it be made locally,
  or is a small design improvement warranted now? These are internal checkpoints,
  not mandatory reports or approval gates.
- Match defenses to actual trust boundaries, credible failures and explicit
  requirements. Reuse existing guarantees; let internal code rely on validated
  contracts. Avoid repeated checks, catch-and-default wrappers and security
  frameworks justified only by hypothetical possibilities. Preserve necessary
  authorization, external-input checks and secret protection.
- Handle necessary safeguards within the authorized scope directly. Surface a
  consequential tradeoff when extra protection would materially change product
  experience, architecture or maintenance cost; do not create routine approval
  steps. Verify relevant behavior and leave a reproducible maintenance path.

## Skill maintenance

For checking, updating, or rolling back this skill installation, use the
`frontend-architect-update` companion. Its source is
`skills/frontend-architect-update/SKILL.md` in the source repository.
Prefer the independently installed companion when available; ordinary frontend
work does not trigger an update check.

## Core reasoning: behavior to evidence

Use one connected model throughout the task. Each decision supplies the next;
new evidence can require revisiting an earlier choice. Scale depth to uncertainty
and impact, not to the number of files. These are reasoning checkpoints, not
mandatory documents or an approval sequence.

| Decision | Establish | Ready to proceed when |
| --- | --- | --- |
| Behavior | Actor, trigger, outcome, meaningful branches and recovery | Acceptance conditions distinguish correct behavior from a plausible substitute |
| Facts | Relevant code, consumers, authoritative interfaces, runtime constraints and unknowns | Consequential assumptions have evidence or are explicitly unresolved |
| Model | Identities, minimal state, transitions, invariants and ownership of effects | Each important fact and resource has an owner, and invalid or stale transitions have a policy |
| Boundaries | Public inputs/outputs, failures, dependencies and internal responsibilities | Consumers need less implementation knowledge, and a realistic change has a predictable home |
| Implementation | Small complete increments, compatibility and recovery | Each increment connects a user or consumer outcome to working code and a meaningful check |
| Evidence | Tests or observations that can expose the original failure | Results justify the acceptance claims, with gaps and remaining delivery work explicit |

An invariant is a rule that must remain true across relevant paths and time,
not just a field type: an old response cannot replace a newer query result;
a resource is released by its owner; the same identity is routed and fetched.
Trace a consequential rule from its owner and enforcement point to a check that
could falsify it. Rendering, validation, submission, caching, and persistence
must agree wherever they share that rule. Keep this connection in code and tests;
a separate traceability document is usually unnecessary.

For a new or changed boundary, walk through one or two realistic changes grounded
in the request, consumers, or history. Identify what would change and what would
remain stable. If a transport change spreads into unrelated UI, or removing one
interaction leaves its state and compensations behind, reconsider the boundary.
Stop when responsibilities, contracts, and verification are clear enough to
implement; apply the maintainable engineering defaults to extension decisions.

## Respect the local system

- Communicate in the user's current language unless they request another one.
  Keep code identifiers and technical terms consistent with the repository;
  write code comments and project documentation in the language established by
  the project.
- Treat the current request and repository instructions as the concrete source
  of scope, conventions, architecture, compatibility, and validation commands.
- Preserve the selected framework and established project patterns when they
  remain suitable. For new applications or structural changes, identify framework
  and router conventions before choosing directories; consult relevant official
  guidance where unsettled. Familiar navigation is part of maintainability, not
  just a naming preference. Do not redesign to demonstrate a preferred style.
- When the task names a sibling product or upstream implementation, inspect its
  relevant contracts before inventing a different structure or maintenance flow.
  Reuse semantics deliberately; visual references do not define domain models.
- Keep unrelated cleanup outside the change. Report a material architectural
  conflict rather than silently expanding scope.
- When another applicable Skill is active, use this Skill for cross-cutting
  engineering judgment and the shared quality bar, and use the specialized
  Skill for its current framework, platform, design, or tool mechanics. Neither
  overrides the user's scope, repository contracts, detected versions, or
  current official documentation.

## Choose the execution path

Apply the core reasoning to the requested work, without expanding its scope:

| Task | Execution and completion |
| --- | --- |
| Clear local edit | Reuse established behavior and boundaries, implement directly, check the affected outcome |
| Feature | Resolve domain ambiguity, connect one complete flow early, then add meaningful branches and recovery |
| Defect | Reproduce the symptom, distinguish hypotheses, fix the responsible boundary, and repeat the decisive check |
| Refactor or simplification | Identify preserved contracts and removed requirements, change incrementally, remove obsolete mechanisms and verify surviving behavior |
| Shared foundation | Identify consumers and a narrow public contract; complete applicable types, diagnostics, artifacts, compatibility and consumer checks |
| Migration | Establish an incremental seam, compatibility and recovery, move consumers in reviewable steps, retire the old path only after evidence |
| Review only | Inspect implementation and evidence against the core model; report actionable findings without silently implementing a redesign |

Resolve consequential ambiguity about actors, identifiers, permissions, and
server guarantees before committing to routes or state ownership. Investigate
from available evidence, continuing independent reversible work. Do not treat a
client-side workaround as fulfilling a missing server guarantee. Implement and verify each
increment in the repository's idiom, revisiting the model when evidence changes.
When a requirement or experiment is abandoned, remove the state, listeners,
compensations and parameter forwarding that served only it, even if still called;
preserve shared mechanisms with remaining consumers.

### Decide how much to write

Choose whether to persist a plan by the decisions that need to survive the
current task, not by file count or the presence of the word "feature":

- For a clear local change using established behavior and boundaries, implement
  directly with a proportionate check; no design document is needed.
- When a bounded change needs explanation but introduces no lasting shared
  contract or difficult tradeoff, state the approach briefly in the conversation.
- Record a concise plan in the project's established location when unresolved
  design choices materially affect shared contracts, ownership across modules,
  compatibility or migration, or a multi-stage delivery that others must continue
  or review. A change touching a shared component alone does not require a document.

Reuse an existing relevant document rather than creating a parallel one. Keep
only acceptance conditions, evidence and constraints, consequential decisions,
and implementation/verification steps that help execution; update decisions
that change during implementation. For an unexplained defect, investigate first
rather than documenting an assumed fix. Follow explicit user or repository
documentation requirements. Writing a plan is not an approval gate: continue
authorized work, asking only about consequential ambiguity that evidence cannot
resolve.

## Apply the solution order locally

Prefer the project abstraction that owns relevant compatibility, errors,
accessibility or lifecycle policy; a native API is not automatically simpler.
For a missing capability, compare suitable standard or maintained solutions with
local composition by total integration and maintenance cost. Verify consequential
version, API and license assumptions when choosing a new dependency; skip external
research for already-settled edits and trivial local operations. Explain concrete
limitations before replacing an established solution.

Use the project's package manager, generation sources and applicable migrations
or codemods, then verify the resulting behavior. Preserve necessary rationale and
reproduction steps in existing repository locations so maintenance does not depend
on chat history or temporary scripts.

## Diagnose before restructuring

For a reported defect, separate the observed symptom, candidate explanation,
and confirmed cause. Reproduce the reported interaction and test a distinguishing
hypothesis before changing a shared abstraction or replacing library behavior.
Compare relevant upstream behavior and local differences when applicable.
If reproduction is unavailable, state the evidence limit instead of declaring
a cause confirmed. When tests disagree with the actual application, inspect
the harness, styles, viewport, data, and event delivery before changing production
code to satisfy them. Withdraw failed experiments as evidence changes.

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

- Prefer plain data and explicit transitions; derive secondary values instead
  of introducing competing sources of truth. Use the core model to check shared
  rules across paths, not only each function in isolation.
- When behavior must remain stable, distinguish the intended observable contract
  from an accidental defect or timing artifact. Disclose any observable change
  instead of silently treating it as cleanup. Do not assume an undesirable
  behavior is outside the contract; when requirements do not decide, condition
  the correction on confirming that contract.
- Keep side effects and external I/O at explicit boundaries with owned cleanup,
  cancellation, race, and error policies.
- Apply module boundaries at every useful scale: package, feature, workflow,
  component, hook/composable, and helper. Express meaningful component and module
  responsibilities in discoverable files, normally separate for independently
  owned interactions. Keep code together while it shares one
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
- Make the main operation readable in execution order. Extract helpers that
  name a rule or own complexity, not a forwarding chain that merely shortens
  the caller. Review inputs, results and error handling at real call sites.
- Choose async policy from the operation's semantics: ignoring stale results,
  cancelling work, serializing writes and server idempotency solve different
  problems. Reuse the project's owner of these policies before adding another.
- Complete the relevant contract: implementation, exported types, affected
  consumers, error behavior, and the highest-value tests and documentation that
  the risk or public API requires. Do not add tests merely to mirror private
  structure, and do not leave placeholders or illustrative fragments in
  delivered code.
- For infrastructure, treat applicable accessibility, compatibility,
  diagnostics, build-output, migration, and release obligations as correctness.
- Measure before optimizing, remove obvious waste, make material failures
  diagnosable without unnecessary sensitive data, and test observable contracts
  rather than private structure. For a reported regression, the decisive check
  must expose that symptom: class names, synthetic events, test counts, or a
  dependency-graph risk label alone do not establish user-visible correctness.

## Load only relevant guidance

Start with this file alone for a bounded local change. Otherwise choose the
dominant unresolved decision and normally read one or two topics. Add another
only when inspected code or new evidence exposes a concrete decision gap;
briefly name that gap before reading. Read incrementally, reuse already loaded
guidance, and stop when enough evidence exists to act. A feature that renders,
fetches and ships does not by itself need all three topics.

For rendering, use the common reference plus the relevant platform extension.
Read multiple platform extensions only for an actual cross-platform decision,
stating which difference must be resolved. Reference count measures context
cost; it is not a substitute for deciding whether guidance is necessary.

- For function bodies and call sites, data representation, local state,
  component or hook ownership, TypeScript, API design, utilities, or refactoring
  decisions that are not already clear, read
  [references/architecture-and-code.md](references/architecture-and-code.md).
- For races, request policy, retries, optimistic reconciliation, operation
  ordering or resource cleanup decisions, read
  [references/async-and-lifecycles.md](references/async-and-lifecycles.md).
- For a new application, structural feature growth, or project, feature, workflow,
  or internal module organization; public
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

## Report the result

Lead with the outcome. Briefly state the important design choice, meaningful
tradeoffs, verification performed, and any remaining risk. Tie consequential acceptance
claims to their evidence, rather than listing test counts alone. For reviews, report
actionable findings by severity before summaries. Do not claim production-grade
quality when relevant checks could not be run. When delivery is in scope,
complete applicable configuration and release preparation, and verify the core
flow after an authorized deployment. Otherwise distinguish local verification
from production validation; planning a release does not authorize publishing.

## Intellectual stance

Use the referenced practitioners and methods as lenses, not authorities. AHA,
Atomic Design, progressive enhancement, intrinsic layout, FLIP, behavior-first
testing, and framework guidance solve different problems and can conflict.
Choose based on evidence from the current product, users, codebase, and target
environment.
