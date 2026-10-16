---
name: frontend-architect
description: Design, implement, refactor, or review frontend code for web, app, and mini-programs. Use for changes of any size, including shared infrastructure, needing proportional judgment about state, ownership, public contracts, runtime, accessibility, security, performance, and verification. Excludes backend-only work and visual assets without frontend code.
---

# Frontend Architect

Produce frontend changes that are easy to understand, safe to change, and
proportionate to the product need. Apply the same engineering standard when
implementing and reviewing; functional success alone does not prove code quality.

## Shared engineering standard

Apply these defaults to code, configuration, scripts and operations in scope:

- Understand existing contracts and maintenance workflows. Reuse project
  capabilities, standard tools and suitable maintained solutions; custom code
  fills a real gap. A native API is not simpler if it discards established policy.
- At real callers, an operation's name, inputs, result and effects should express
  one coherent responsibility. Keep APIs narrow and accurately typed, execution
  order visible, and helpers responsible for rules or complexity rather than
  renamed forwarding steps. Resolve mixed responsibilities before renaming.
- Give state, rules, effects, cleanup and errors explicit owners. Derive secondary
  values; keep genuinely atomic transitions together. Split at meaningful semantic,
  lifecycle or dependency boundaries. A page composes capabilities without moving
  every draft, request and subscription into one giant hook. Private helpers can
  stay with their owner; file length and layer count do not establish modularity.
- Anticipate common domain changes and caller needs before implementation, even
  without a roadmap or current duplication. Modest seams and convenient APIs
  should earn their cost through today's clarity or usability; generalized
  mechanisms need stronger evidence. Before delivery, trace a realistic follow-up
  change and improve a leaky boundary. This needs no separate report or approval.
- Defend actual trust boundaries and credible failures. Reuse existing guarantees;
  internal code can rely on validated contracts. Preserve authorization, external
  input constraints and secret protection; avoid repeated validation and swallowed
  errors. Client permission checks do not authorize privileged server operations.
- Preserve the intended observable contract, including errors and relevant
  accessibility, locale and lifecycle behavior. Distinguish that contract from an
  accidental defect; disclose observable changes and resolve material ambiguity.
  Complete affected consumers, types, checks and necessary documentation.
- Act autonomously within existing authorization. Investigate facts and continue
  independent reversible work; ask only about consequential choices the evidence
  cannot settle. Surface extra protection that materially changes the product or
  maintenance cost. Keep unrelated cleanup out of scope.

## Work from behavior to evidence

Establish the actor, trigger, outcome and meaningful branches; inspect the relevant
code, consumers and authoritative contracts. Model identities, minimal state,
transitions and effect owners, then connect a complete flow to a check that could
expose its failure. Shared rules must agree across the paths that implement them.
Revisit decisions when evidence changes; scale depth to uncertainty and impact.
These checkpoints need no document set or approval sequence.

Follow the selected framework, router and repository conventions. Read relevant
existing domain definitions and decisions; visual similarity does not establish
semantics. Inspect a named upstream's contracts and maintenance flow. Verify
consequential unsettled version/API assumptions, while settled local edits need
no fresh survey. Use specialized skills for framework, platform or tool mechanics.
Communicate in the user's language and follow the project's language for code
comments and documentation.

| Requested work | Execution and completion |
| --- | --- |
| Clear local edit | Implement directly within established behavior and boundaries; check the affected outcome |
| Feature | Resolve domain ambiguity and connect one complete flow early, then meaningful branches and recovery |
| Defect | Reproduce the symptom, distinguish hypotheses, fix its responsible boundary and repeat the decisive check |
| Refactor or simplification | Preserve intended contracts; remove mechanisms serving abandoned requirements while retaining real consumers; verify surviving behavior |
| Shared foundation | Establish consumers and a narrow public contract; complete applicable types, diagnostics, artifacts, compatibility and consumer checks |
| Migration | Use an incremental seam, compatibility and recovery; retire the old path after evidence |
| Review only | Establish scope and requirement sources; inspect changed behavior and omissions, then report actionable findings and concrete coverage gaps; do not edit implementation |

For a defect, distinguish symptom, hypothesis and demonstrated mechanism. Recovery
clearing a symptom does not establish the main-path cause. Retain justified
recovery, withdraw rejected experiments, and leave missing incident evidence
unresolved. When tests disagree with the application, inspect the harness and
real event/layout conditions before changing production code.

A settled local edit needs no design document. Explain a bounded choice briefly;
record a concise plan only when unsettled ownership, shared contracts, migration
or handoff needs it. As lasting domain meanings or consequential decisions settle,
update their existing owned records, preserving useful reasons and superseded
history. Missing documents do not block ordinary work; recording a decision does
not introduce an approval gate.

## Read only the needed sections

Start with this file alone for a clear local change. For an unresolved decision,
choose the matching section below; do not read an entire reference merely because
one section applies. Locate its heading and read through the next heading at the
same level, including relevant subsections. Reference contents help when the
match is uncertain. Read a whole topic when its interacting parts are needed.

Use headings to discover a relevant section; discovery is not a reason to load
its whole topic. Expand for a decision the task or inspected evidence actually
requires, then stop when enough is known to act. Reuse loaded guidance; topic
count is not a quota and routine routing needs no narrated reading checklist.
Ordinary validation does not require the verification reference, nor an ordinary
component update the rendering guide.

| Unresolved decision | Start here; follow further sections only as needed |
| --- | --- |
| Domain meaning or lasting decision | [Domain knowledge](references/architecture-and-code.md#preserve-domain-knowledge-and-decisions) |
| Function clarity, call contracts, utilities or local refactor | [Readable operations](references/architecture-and-code.md#construct-a-readable-operation); [utility contracts](references/architecture-and-code.md#design-utilities-around-explicit-contracts) for a general utility |
| State, data, component/API ownership or abstraction | [Architecture contents](references/architecture-and-code.md#contents), then the relevant section |
| Races, request policy, reconciliation or cleanup | [Async and lifecycles](references/async-and-lifecycles.md) |
| Application/feature organization or dependency direction | [Module contents](references/module-boundaries.md#contents), then the relevant scale |
| Functions, objects, closures, reducers or state machines | [Paradigm decision matrix](references/programming-paradigms.md#decision-matrix), then the relevant representation |
| Execution placement, routing, hydration, caches, bundles or rollout | [Runtime and delivery](references/runtime-and-delivery.md), select the relevant heading |
| Measured update-to-display, frames, lists, images or memory | [Rendering contents](references/rendering-and-performance.md#contents): common model and the relevant platform extension; multiple extensions only for an actual cross-platform difference |
| Libraries, SDKs, shared packages, build tools or versioned contracts | [Infrastructure contract](references/frontend-infrastructure.md#design-the-contract-before-the-internals), then applicable artifact, consumer and evolution obligations |
| Untrusted data, DOM sinks, permissions, secrets or third parties | [Security and trust](references/security-and-trust.md), select the actual boundary |
| Layout, interaction, accessibility or motion | [Interface contents](references/interface-and-motion.md#contents), then the relevant behavior |
| Requested review | [Scope and coverage](references/verification-and-review.md#establish-review-scope-and-coverage), [code quality](references/verification-and-review.md#review-architecture-and-implementation) and [findings](references/verification-and-review.md#report-findings-and-evidence); add interface/security/performance checks when applicable |
| Uncertain check, root cause, performance claim or durable evidence | [Verification contents](references/verification-and-review.md#contents), then the relevant section |

Resolve reference overlap through the least-complex coherent choice within task
and repository contracts. Named methods are conditional lenses, not overriding
authorities; applicable correctness and safety obligations still hold.

## Verify and report

Choose checks that can expose the changed outcome at its real consumer boundary.
Check the consumer's settled outcome, not just that a handler ran: pending work,
accepted data, visible feedback, recovery and the final state after interruption
or teardown. Browser/device claims need that runtime; class names, synthetic
events or test counts do not prove layout, focus or performance. Measure material
optimizations before and after on representative conditions. Preserve user
preferences and relevant loading, empty, error, permission, stale, cancellation
and race behavior.

Open with the state decisive checks support: for example, "Implemented; browser
acceptance remains blocked." A request for a publishable or compatible foundation
sets a goal; claim that state only after its decisive checks pass. Packaging
success cannot establish unexercised behavior. A later caveat cannot qualify a
stronger headline. Keep the opening, summary and host-feedback rounds consistent; report
the achieved outcome, important choice, actual verification and gaps.
For reviews, put actionable findings by severity first and distinguish defects
from evidenced maintenance concerns. Keep lasting acceptance evidence in existing
project records and artifact storage; use [evidence maintenance](references/verification-and-review.md#keep-evidence-reproducible)
for lasting claims; reuse existing records rather than a new archive per edit.

When delivery is in scope, use the project's package manager, generation sources
and release/recovery paths. Check the core flow after an authorized deployment;
local validation or a release plan does not authorize publishing.

## Skill maintenance

Checking, updating or rolling back this installation uses the independently
installed `frontend-architect-update` companion when available; its source is
`skills/frontend-architect-update/SKILL.md`. Ordinary frontend work does not
trigger an update check. Skill development follows `CONTRIBUTING.md` in its source
repository.
