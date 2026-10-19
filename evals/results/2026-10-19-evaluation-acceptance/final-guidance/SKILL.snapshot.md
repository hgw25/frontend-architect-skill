---
name: frontend-architect
description: Develop frontend requirements through connected architecture design, implementation and verification; review code against product contracts and the same engineering standard. Autonomously discover context and complete the requested delivery for web, app and mini-programs, including shared foundations and design-only work. Excludes backend-only work and visual assets without frontend code.
---

# Frontend Architect

Produce frontend changes that are easy to understand, safe to change, and
proportionate to the product need. Apply the same engineering standard when
implementing and reviewing; functional success alone does not prove code quality.

## Own the task from a short request

The user supplies the outcome and target, not a checklist of engineering duties.
Requirement development and architecture design form one feedback loop: product
rules and acceptance shape responsibilities, code contracts and data flow;
implementation and verification expose constraints that refine the design and
step sequence. A development request includes the applicable architecture work.
Infer the requested delivery boundary from context: complete development, a
design-only deliverable or review only. Discover relevant requirements, accepted decisions, code,
consumers and checks yourself; choose the needed guidance without waiting for the
user to name modularity, function design, state ownership, diagrams or review axes.
Ask only when a consequential choice remains unresolved after investigation;
continue independent work. Do not stop at a plan when implementation is requested.

Use the full applicable shared standard throughout development, design and review.
Task size changes scope, design detail and verification effort, not whether clarity,
correctness and maintainability matter. "Highest standard" does not justify invented
defects, speculative frameworks or claims beyond evidence. Respect an explicitly
limited scope and existing authorization; design-only and review-only requests do
not authorize implementation. Routine workflow selection needs no approval.

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
For a confirmed effect followed by fallible work, use the
[error-ownership guidance](references/async-and-lifecycles.md#keep-errors-actionable-and-owned)
to design independently observable confirmation, then exercise success followed
by secondary failure through the final consumer. If existing checks omit this
consequential combination, add and run a focused regression as the increment's
acceptance check, including each materially different delivery path. Wire the
follow-on work against that check; green tests of the separate steps are insufficient.
Choose checks from these boundaries without waiting for a user-supplied list.
Before changing a cost-sensitive path or claiming better responsiveness, obtain
the [unchanged baseline](references/rendering-and-performance.md#define-the-performance-contract);
schedule this before implementation, alongside the initial design.
Revisit decisions when evidence changes; scale depth to uncertainty and impact.
For work that needs design, turn these checkpoints into the technical document
required below before changing implementation. Documentation adds no approval gate.

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
| Feature | Decompose requirements and design their supporting architecture together; save the initial technical design, implement and verify ordered increments, and reconcile contracts and diagrams with the evidence |
| Design-only delivery | Carry the same requirement-to-architecture work through an implementation-ready document with functional steps, code contracts and both diagrams; save and link it, distinguish proposed checks from executed evidence, and respect the requested stopping point |
| Defect | Reproduce the symptom, distinguish hypotheses, fix its responsible boundary and repeat the decisive check |
| Refactor or simplification | Preserve intended contracts; remove mechanisms serving abandoned requirements while retaining real consumers; verify surviving behavior |
| Shared foundation | Establish consumers and a narrow public contract; complete applicable types, diagnostics, artifacts, compatibility and consumer checks |
| Migration | Use an incremental seam, compatibility and recovery; retire the old path after evidence |
| Review only | Infer scope, discover requirement sources and assess both requirement compliance and the shared engineering standard; inspect real code and omissions, report evidenced findings and a bounded quality conclusion; do not edit implementation |

For a defect, distinguish symptom, hypothesis and demonstrated mechanism. Recovery
clearing a symptom does not establish the main-path cause. Retain justified
recovery, withdraw rejected experiments, and leave missing incident evidence
unresolved. When tests disagree with the application, inspect the harness and
real event/layout conditions before changing production code.

### Design before and during implementation

For new or changed business workflows, refactors that redistribute responsibilities,
shared foundations and migrations, create or update a technical document before
editing implementation, even when the user asks only for the feature. Read
[technical design](references/architecture-and-code.md#turn-requirements-into-an-executable-technical-design).
Decompose the requirement into an explicitly counted, dependency-ordered sequence;
map each step's functions or classes to its functionality, contracts and acceptance.
Include both a technical architecture diagram and a data-flow diagram. Keep this
design aligned with implementation and verification through delivery.

Use the shared engineering standard and relevant routed guidance to make these
decisions throughout development. Connect reuse, responsibility and dependency
boundaries, paradigm choice, state/resource ownership and realistic evolution to
the required behavior; include applicable runtime, trust, interface and performance
obligations. Preserve consequential choices, concrete reasons and checks in the
design. Assess engineering quality in both the proposal and actual implementation;
document completeness and passing behavior tests alone do not establish it.
Select the applicable depth yourself; topic names and prescribed patterns are not
a quota for every design.
Infer applicable methods from the requested behavior, even when the user names no
technique. Use the [behavior-to-design lenses](references/architecture-and-code.md#match-design-lenses-to-behavior)
before settling steps and contracts, then read the matching sections. For example,
spatial continuity during reordering calls for transition-mechanism evaluation,
including FLIP when geometry mapping is needed. Carry the selected method's
invariants, ownership and checks into the design and implementation.

A settled local edit that only follows established behavior and boundaries needs
no design document: for example a label, spacing token or existing filter binding.
Do not use file count or the absence of ambiguity to exempt a new business flow.
Investigation and read-only review need no implementation document unless requested;
an unexplained defect needs causal evidence before a proposed redesign.
Use the project's existing documentation location and relevant owned record; if
none exists, create a discoverable document. Scale detail to the actual requirement,
without waiting for document approval. Preserve useful decision reasons and history.

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
| Async commands, request policy, reconciliation or cleanup | [Async and lifecycles](references/async-and-lifecycles.md) |
| Application/feature organization or dependency direction | [Module contents](references/module-boundaries.md#contents), then the relevant scale |
| Functions, objects, closures, reducers or state machines | [Paradigm decision matrix](references/programming-paradigms.md#decision-matrix), then the relevant representation |
| Execution placement, routing, hydration, caches, bundles or rollout | [Runtime and delivery](references/runtime-and-delivery.md), select the relevant heading |
| Measured update-to-display, frames, lists, images or memory | [Rendering contents](references/rendering-and-performance.md#contents): common model and the relevant platform extension; multiple extensions only for an actual cross-platform difference |
| Libraries, SDKs, shared packages, build tools or versioned contracts | [Infrastructure contract](references/frontend-infrastructure.md#design-the-contract-before-the-internals), then applicable artifact, consumer and evolution obligations |
| Untrusted data, DOM sinks, permissions, secrets or third parties | [Security and trust](references/security-and-trust.md), select the actual boundary |
| Layout, interaction, accessibility or component systems | [Interface contents](references/interface-and-motion.md#contents), then the relevant behavior |
| Reordering, shared elements or interrupted spatial transitions | [Transition mechanism](references/interface-and-motion.md#choose-the-lightest-transition-mechanism); [FLIP](references/interface-and-motion.md#apply-flip-deliberately) when geometry mapping is needed |
| Requested review | [Scope and coverage](references/verification-and-review.md#establish-review-scope-and-coverage), [code quality](references/verification-and-review.md#review-architecture-and-implementation) and [findings](references/verification-and-review.md#report-findings-and-evidence); add interface/security/performance checks when applicable |
| Uncertain check, root cause, performance claim or durable evidence | [Verification contents](references/verification-and-review.md#contents), then the relevant section |

Resolve reference overlap through the least-complex coherent choice within task
and repository contracts. Named methods are conditional lenses, not overriding
authorities; applicable correctness and safety obligations still hold.

## Verify and report

Before delivering a design, inspect its proposed contracts, ownership and flows
against the same engineering standard; resolve evidenced design gaps and keep
unsettled facts explicit.
Before delivering implementation, inspect the actual changed code and affected
callers against the same engineering standard used in a requested review; remedy
in-scope defects and maintenance problems. Passing behavior checks is not this
code-quality check, and the check needs no separate review ceremony.

Use the design's functional increments to close the delivery: each required outcome
needs its located implementation and decisive evidence, with the same status in
the owned document. A disclosed omission remains incomplete; other passing checks
do not cancel it. After the last check, reconcile the document from final files
and actual results rather than leaving completed work as future instructions.

Choose checks that can expose the changed outcome at its real consumer boundary.
Check the consumer's settled outcome, not just that a handler ran: pending work,
accepted data, visible feedback, recovery and the final state after interruption
or teardown. Browser/device claims need that runtime; class names, synthetic
events or test counts do not prove layout, focus or performance. Measure material
optimizations against the unchanged input and final corrected code on comparable
representative conditions; recover an original snapshot if the baseline was missed.
After the final source edit, rebuild important implemented contract entries from
their located definitions, retaining injected/context parameters and actual calling
conventions. Replace proposed names with the actual callable or inline owner;
check representative callers, both diagrams and executed evidence. Updating test
status alone does not complete this check. Preserve user
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
