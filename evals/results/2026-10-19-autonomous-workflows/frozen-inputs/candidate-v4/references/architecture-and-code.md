# Architecture and Code Decisions

Use this reference for domain concepts and lasting decisions, frontend architecture,
state and data flow, component boundaries, hooks/composables, utilities, TypeScript,
API design, refactoring and dependency choices.

Use [module-boundaries.md](module-boundaries.md) instead when project or feature
organization is the dominant decision, [programming-paradigms.md](programming-paradigms.md)
for representation choices, and [runtime-and-delivery.md](runtime-and-delivery.md)
for execution, placement, cache, or delivery boundaries.

## Contents

- [Understand before changing](#understand-before-changing)
- [Preserve domain knowledge and decisions](#preserve-domain-knowledge-and-decisions)
- [Turn requirements into an executable technical design](#turn-requirements-into-an-executable-technical-design)
- [Construct a readable operation](#construct-a-readable-operation)
- [Choose data representations](#choose-data-representations)
- [Model data and state](#model-data-and-state)
- [Model forms and navigation state](#model-forms-and-navigation-state)
- [Place behavior by ownership](#place-behavior-by-ownership)
- [Design components and APIs](#design-components-and-apis)
- [Abstract at the right time](#abstract-at-the-right-time)
- [Design utilities around explicit contracts](#design-utilities-around-explicit-contracts)
- [Route asynchronous decisions](#route-asynchronous-decisions)
- [Use types to encode constraints](#use-types-to-encode-constraints)
- [Adapt across frameworks](#adapt-across-frameworks)
- [Influences](#influences)

## Understand before changing

Build a small, evidence-based model of the relevant system:

- What outcome does the user need?
- Where does the authoritative data originate?
- Which code owns mutation, validation, persistence, and presentation?
- Which public contracts and downstream consumers are affected?
- What existing primitive or convention already addresses part of the problem?
- Which states or failures are currently implicit?

Inspect the narrowest useful slice first, then widen only when imports, callers,
runtime flows, or shared contracts require it. A large repository does not
justify a broad rewrite.

Before mapping an identity into a route or combining endpoint results, establish
what each identifier names, which actor is viewing or mutating the resource,
and what the server already guarantees. Similar strings are not interchangeable
identities. Do not compensate for uncertain contracts by adding requests,
client-side joins, or guessed IDs. Reconcile generated types, documentation,
explicit product requirements, and available response evidence; report a missing
contract precisely and complete independent work. A missing author-to-user
mapping, for example, must remain an explicit incomplete navigation path.

## Preserve domain knowledge and decisions

Use the project's existing language and decision records in the affected area,
including context-specific definitions when present. Compare definitions with
the request, accepted revisions, authoritative interfaces and actual code. An old
record is evidence of a prior contract, not permission to override a confirmed
change. Distinguish a known stale record from an unresolved contradiction; ask
only when that contradiction changes the implementation and available evidence
cannot settle it. Continue independent work while it remains open.

When a concept is resolved and later callers or maintainers will need it, update
its owned record during the work rather than leaving it in chat history. Keep
three kinds of information distinct:

| Information | What belongs in its record |
| --- | --- |
| Domain definition | What the concept means, identity and relationships, and ambiguous aliases worth distinguishing |
| Consequential decision | Context, chosen alternative, reason and non-obvious consequences; link an earlier decision when replacing it |
| Technical design | Requirement decomposition, ordered functional increments, supporting contracts, architecture and data-flow diagrams, implementation and verification; see the technical-design section below |

A domain definition should let another maintainer distinguish such concepts as
a seller profile, organization and signed-in user; their identifiers do not
become interchangeable because they are all strings. Keep external field names
stable while making their meaning clear. Use precise project terminology in
code, tests and documentation without replacing established component, service
or API vocabulary with a new universal glossary.

Reuse the existing source of truth and link to it from the relevant consumer
documentation when discovery needs help. A new short record earns its place when
a recurring concept or a consequential, non-obvious tradeoff would otherwise
need rediscovery. Use the project's documentation location and format; create
only what there is meaningful knowledge to record. A settled local edit needs no
glossary, ADR, setup session or documentation approval. In a review-only task,
report stale definitions or missing rationale without editing project records.

Keep unresolved assumptions visibly unresolved. Update or supersede stale
material when the confirmed contract changes, preserving useful rationale and
project history conventions. Check one plausible later use: can a new maintainer
find the definition or decision and apply it without the original conversation?

## Turn requirements into an executable technical design

Use this section for the design-bearing work identified in SKILL.md. The document
is an implementation input: establish it after inspecting the relevant system and
before changing source, tests, configuration or generation templates. Inspection,
reproduction and baseline checks can precede it. Do not substitute a chat outline
or an after-the-fact description of finished code. Reuse a relevant owned document;
otherwise add one under the project's documentation convention and link it from
an existing discovery point when available. Missing documentation is a reason to
write the design, not to skip it or wait for an initialization session.

Keep the following information connected, using the project's format rather than
a mandatory heading template:

1. **Requirement and facts.** State the intended outcome, scope, business rules,
   acceptance conditions, existing capabilities and authoritative data/contracts.
   Distinguish inspected facts, proposed changes and unresolved assumptions.
2. **Functional decomposition and sequence.** State how many implementation steps
   are needed and order them by dependency. Each step identifies the functionality
   delivered, prerequisites, affected owners/files, supporting operations and a
   concrete completion check. Split into coherent verifiable increments, not an
   arbitrary quota or generic "analyze, code, test" tasks. Show how the steps cover
   the whole requirement, including meaningful branches and recovery.
3. **Supporting code contracts.** Map each product capability to the modules, types,
   operations and classes that implement it; identify actual supporting symbols. Give
   important names/locations, responsibilities, typed inputs/results or equivalent
   signatures, callers/dependencies, state/effect ownership and relevant error or
   cleanup semantics. Distinguish reused, changed and new contracts. Design classes
   or interfaces where identity, lifecycle or a real substitution boundary warrants
   them; pure functions and existing primitives may suffice. Do not invent an
   abstract class per capability or enumerate trivial private helpers in advance.
4. **Technical architecture diagram.** Show the concrete modules or components,
   runtime/external boundaries, responsibilities and dependency or call direction.
   Label significant interfaces/operations; a directory tree alone is insufficient.
5. **Data-flow diagram.** Follow a representative input through named operations,
   transformations, state/storage or transport to its returned or visible outcome.
   Include return paths and consequential failure, cancellation or stale-result
   branches. Label data and owners. An appropriately annotated sequence diagram
   is suitable; duplicating the architecture graph without data movement is not.
6. **Verification and evolution.** Tie each step and important rule to a decisive
   check. Record applicable compatibility/migration/recovery and one realistic
   follow-up change, without building speculative general mechanisms.

Both diagrams must be readable in the document and agree with its symbol and data
contracts. Prefer the repository's supported format and existing renderer/parser.
For a diagram DSL such as Mermaid, actually check its syntax before calling the
design complete; merely disclosing that no renderer ran does not validate it.
If no usable diagram tool is available, use self-contained, labelled plain-text
diagrams with explicit arrows and branches rather than unverified DSL. Both views
remain required, and a directory tree is still insufficient. Do not install a
separate toolchain merely to draw a small design. Retain editable sources for any
generated assets, verify references and distinguish syntax from visual validation.
In Mermaid, quote node and edge labels containing punctuation such as function
calls. A diagram that cannot parse is an incomplete deliverable.
Use a small number of representative flows, expanding only for materially
different behavior. Detail should enable
another engineer to implement the next step without reconstructing the chat;
length, diagram count beyond the two required views, and exhaustive pseudocode
are not goals.

Once the design is concrete enough to act, implement its ordered increments within
existing authorization. A new consequential unknown can hold its dependent step
while independent work continues; creating the document itself requires no approval.
Update the same document when contracts or steps change, keeping planned checks
distinct from executed results. At delivery reconcile diagrams, symbols and step
status with the final code and actual evidence. Do not claim a planned runtime
check passed, and do not describe a superseded design as the current implementation.

For design-only requests, save the technical document in the workspace and link it
in the response; a chat-only proposal is not the completed artifact. If context is
supplied as inline source or contracts and the workspace has no application files,
use those inputs, label proposed paths and unsettled facts, and save the design
without fabricating an existing repository or adding implementation skeletons.
Do not silently start development.
For settled local edits, retain the lightweight path in SKILL.md; do not create
diagrams just to satisfy a workflow intended for design-bearing requirements.

## Construct a readable operation

Start from an actual caller and a complete behavior. Keep the main path readable
in execution order: establish valid input, apply the rule, perform the owned
operation, and return an outcome. Guard clauses can separate unavailable or
invalid inputs; do not split each line into a named step merely to flatten code.

- Pass the values or capabilities the operation needs, not a whole page/store
  that lets it read and mutate unrelated state. A coherent domain object is
  often clearer than many extracted scalar parameters.
- Extract a helper when its name communicates a rule and its implementation
  hides meaningful detail. Keep a short single-use calculation inline when
  extraction forces the reader to navigate without learning anything new.
- Keep one level of explanation in an orchestration function: delegate a complex
  parser or algorithm, but retain the visible ordering of validation and writes.
  Avoid chains such as submit -> handleSubmit -> performSubmit that only rename
  the same operation and pass the same options through.
- Prefer explicit return values to output parameters or a mutable context bag
  that helpers enrich in a hidden order. If order is essential, own it inside
  one operation; do not make callers remember prepare/set/validate/commit unless
  those are intentional separately usable states.
- A branch belongs where its rule is owned. Repeated branching on the same mode
  across helpers may indicate a missing coherent representation; two ordinary
  branches do not justify a strategy registry.
- Judge names at the call site: include the domain meaning and important effect,
  not vague process/manager/data labels or mechanical prefixes. Comments explain
  reasons, constraints and unusual ordering; avoid restating the next line.

### Example: make a decision before mutating

Suppose selected entries can be exported only when every entry is ready. This
representation makes the all-or-nothing rule visible and keeps I/O out of it:

```ts
type Entry = { id: string; status: 'pending' | 'ready' }
type ExportDecision =
  | { kind: 'empty' }
  | { kind: 'blocked'; ids: string[] }
  | { kind: 'ready'; ids: string[] }

function decideExport(entries: readonly Entry[]): ExportDecision {
  if (entries.length === 0) return { kind: 'empty' }
  const blocked = entries.filter(entry => entry.status !== 'ready')
  if (blocked.length) return { kind: 'blocked', ids: blocked.map(entry => entry.id) }
  return { kind: 'ready', ids: entries.map(entry => entry.id) }
}

async function exportSelection(
  entries: readonly Entry[],
  send: (ids: readonly string[]) => Promise<void>,
): Promise<ExportDecision> {
  const decision = decideExport(entries)
  if (decision.kind !== 'ready') return decision
  await send(decision.ids)
  return decision
}
```

The caller can display empty/blocked feedback, and a failed write remains a
rejected operation. Contrast this with mutating a context object while sending
one entry at a time and only later discovering a blocked entry. The boundary
here protects a real rule; it does not require a service class or one file per
function. This assumes `send` is the existing authoritative operation: local
eligibility does not make server writes atomic or authorize an export.

## Choose data representations

Separate meanings that actually differ; do not mechanically create DTO, entity,
model and view-model copies for every object.

| Representation | Reason to keep it distinct |
| --- | --- |
| Raw external value | Shape or meaning is not yet trusted |
| Validated domain value | Internal operations can rely on explicit constraints |
| Editable draft | Incomplete text and unsaved changes are legitimate |
| Confirmed value | A source has acknowledged it; rollback must preserve that history |
| Display projection | Derived formatting or selection, not another writable truth |

Normalize at the boundary that owns the external contract, then let internal
code rely on it. Do not scatter `?.`, `?? []`, casts and repeated parsing through
consumers to make malformed responses look like successful empty data. Defaults
are appropriate only when absence has that documented meaning. Keep empty, zero,
false, null and missing distinct where the domain distinguishes them.

Static types cannot validate an external ID, permission, numeric range or
response shape. Runtime validation establishes those facts; discriminated unions
can then eliminate invalid combinations internally. Branded IDs are useful when
accidental interchange is a demonstrated risk, not as a requirement for every
string. Prefer constructor/parser boundaries or existing schemas over unchecked
assertions that claim validation has occurred.

A state shape should express the product contract. If results remain visible
while refreshing, retain their query/identity and freshness explicitly rather
than forcing them into a loading state with no data or treating them as results
for the new query. Related fields that must change atomically belong to one
transition; independent draft and request lifecycles need not share one object.

Pass a stable snapshot into an async operation when subsequent user edits must
not change its meaning. Copy the necessary values at the boundary rather than
cloning an entire store by reflex. Readonly types constrain a typed caller; they
do not make externally shared mutable objects immutable at runtime.

## Model data and state

Store the minimal, complete set of information the interface must remember.
Derive everything else where it is consumed.

Before adding state, ask:

1. Does it change over time?
2. Is it already supplied by props, a store, the URL, a form, cache, or server?
3. Can it be calculated from existing values?
4. Is another state variable representing the same fact?
5. What event owns the transition?
6. Can the proposed representation express contradictory states?

Prefer a representation such as:

```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

over unrelated booleans such as `isLoading`, `isSuccess`, and `isError` when
those booleans can contradict one another. Do not introduce a state machine for
a two-state local toggle; use it when transitions, concurrency, or invalid
combinations are actually difficult.

Keep state close to the smallest common owner of the consumers. Promote it only
when multiple consumers need shared coordination, persistence, or routing.

## Model forms and navigation state

Treat a non-trivial form as a workflow, not a bag of controlled inputs. Separate:

- editable draft values from server-authoritative values;
- derived display values from persisted fields;
- touched, dirty, validating, submitting, succeeded, and failed states when the
  product distinguishes them;
- client feedback from authoritative server validation and field or form errors;
- synchronous constraints from asynchronous checks that can race or become stale.

Keep submission idempotency, duplicate activation, cancellation, draft recovery,
and unsaved-navigation behavior explicit when failure would lose work or create
duplicate effects. Map server errors to fields only when the server contract
provides stable field identity; otherwise preserve a form-level recovery path.
Do not introduce a form library merely because a form exists, but use the
project's established form model when it already owns these lifecycles.

State belongs in the URL when users must be able to bookmark, share, reload, or
navigate back and forward through it. Define one parser and serializer with
defaults, validation, canonical ordering, and unknown-value behavior. Decide
which changes create history entries and which replace the current entry. Keep
ephemeral input, secrets, and large drafts out of URLs. Verify initial server and
client interpretation, `popstate` or router navigation, focus, scroll restoration,
and interactions between URL state and cached data when those behaviors apply.

## Place behavior by ownership

- Pure transformation belongs near the domain data or use site.
- User-event logic belongs in the event path that explains why it ran.
- Synchronization with a browser API, network subscription, timer, external
  widget, or other external system belongs at an explicit effect boundary.
- Data access belongs behind a boundary that makes loading, cancellation,
  caching, and errors observable.
- Presentation components should not silently own cross-page policy.

An effect is not a general-purpose place to react to any state change. If a
value can be calculated during rendering, derive it. If logic is caused by a
specific user action, keep it in that event path. Always define subscription
cleanup and consider stale responses or remounting.

## Design components and APIs

Create a component or module boundary when it provides at least one meaningful
benefit:

- a recognizable product or domain concept;
- independent state, lifecycle, accessibility, or error behavior;
- reuse with the same semantics;
- a stable policy boundary;
- isolation of a complex external integration;
- materially clearer reading and testing.

Weak reasons on their own include file length, a single JSX fragment, visual
similarity, or the possibility of future reuse.

Prefer composition and explicit variants over combinations of booleans:

```tsx
<Dialog size="compact" footer={<Actions />} />
```

is usually easier to reason about than a component whose behavior emerges from
`isCompact`, `hasFooter`, `isConfirm`, `hideClose`, and `usePortal` combinations.
Do not convert every boolean into configuration mechanically; first determine
whether the component owns too many responsibilities.

Good APIs:

- make the common case obvious;
- have one clear source of truth;
- keep parameter meanings stable;
- expose capabilities rather than internal mechanics;
- document mutation, ownership, identity, and error behavior when non-obvious;
- provide narrow escape hatches for concrete constraints or credible expected
  variation, without exposing internals for arbitrary hypothetical uses.

## Abstract at the right time

Apply AHA: avoid hasty abstractions. Similar syntax is not sufficient evidence
that two pieces of code represent the same knowledge.

Before extracting shared code, compare:

- business meaning;
- reason and frequency of change;
- required inputs and outputs;
- error and lifecycle behavior;
- whether callers would need flags or exceptions;
- whether the abstraction improves the call site as well as its implementation.

Some duplication is cheaper than an abstraction that accumulates branches.
Extract when stable commonality has become visible, not when future reuse is
merely imaginable. Conversely, do not use AHA to preserve obvious duplicated
business rules that must change together.

Do not wait for duplication to notice a volatile boundary. Before implementing,
consider common domain changes and likely caller needs; a small seam or a more
convenient API can be justified before a second consumer exists. Compare a
realistic call site or follow-up change with and without it. Keep that benefit
proportionate to the added concepts, and defer generalized registries, options or
compatibility branches that the expected change does not require. Revisit this
judgment before delivery rather than assuming a minimal first draft is sufficient.

When simplifying a workflow, reassess the mechanisms rather than just removing
an option from the UI. Trace the removed behavior's state, subscriptions,
compensations, adapters, and forwarded parameters. Remove those with no remaining
requirement, preserve shared mechanisms with real consumers, and validate the
surviving interaction. Reachable code can still be unnecessary. Do not create
another configuration flag merely to keep an abandoned design alive.

## Design utilities around explicit contracts

Before creating a general utility:

1. Check the current language, browser, framework, and project capabilities.
2. Define the accepted input domain and exact return contract.
3. Decide whether mutation, ordering, identity, and key coercion matter.
4. Prefer one explicit callback or data contract over convenience overloads
   whose benefit is smaller than their type and runtime cost.
5. Test adversarial values at language boundaries, not every imaginable input.

### Example: grouping values

Do not copy a custom `groupBy` automatically. First determine whether the target
environment can use `Object.groupBy()` or `Map.groupBy()`.

- Use an object-shaped result when group keys are property keys and object
  access is the desired API.
- Use `Map` when keys may be objects, identity matters, or coercion is unwanted.
- If implementing an object accumulator, avoid inherited-key collisions such as
  `constructor`, `toString`, and `__proto__`; use a null-prototype object and an
  own-property-safe strategy.
- Do not reassign a selector parameter from a string to a function. Prefer a
  single callback API unless realistic call sites show that property-name
  shorthand improves usability enough to justify its typing and runtime cost;
  repeated usage or a benchmark is not a prerequisite for that judgment.
- In TypeScript, reflect partial group presence and key constraints accurately.

These are return-contract decisions, not a mandate to replace an existing
project utility that already supplies compatible semantics. Test keys and
identity through the public API rather than comparing loop syntax.

## Route asynchronous decisions

When async behavior is material, read
[async-and-lifecycles.md](async-and-lifecycles.md) for operation policy, publication
of results, reconciliation, errors and cleanup. Simple requests should continue
to use the established framework or project data layer; do not build a second
cache or request state owner just to demonstrate these mechanisms.

## Use types to encode constraints

- Validate untrusted values at the runtime boundary; static types do not validate
  network, storage, URL, or user input.
- Prefer domain types and discriminated unions over bags of optional fields.
- Keep generic parameters tied to real relationships between inputs and outputs.
- Avoid assertions that promise more than runtime behavior guarantees.
- Distinguish absent, empty, pending, and failed when the product behavior does.
- Preserve external contract names; do not rename them merely to satisfy an
  internal naming preference.

Types should remove ambiguity for callers. A type signature that is harder to
understand than the behavior may indicate that the API is too clever.

## Adapt across frameworks

Translate principles into the selected framework's model:

- React: pure rendering, minimal state, explicit effect boundaries, composition.
- Vue: computed values for derivation, clear ownership of refs/reactivity, scoped
  composables.
- Svelte: explicit reactive dependencies and framework-native lifecycle.
- Angular: clear injection and observable ownership, template semantics, and
  bounded services.
- Web Components or vanilla web: platform lifecycle, events, attributes versus
  properties, and progressive enhancement.

These are routing hints, not framework mandates. Read the current official
documentation for version-sensitive behavior, and verify against the actual
framework runtime rather than translating React-specific APIs mechanically.

## Influences

These sources inform the decision rules; do not imitate their syntax blindly.

- Kent C. Dodds, [AHA Programming](https://kentcdodds.com/blog/aha-programming):
  delay abstraction until its stable shape is visible.
- Sandi Metz,
  [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction):
  wrong shared abstractions can cost more than duplication.
- React documentation,
  [Thinking in React](https://react.dev/learn/thinking-in-react) and
  [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect):
  minimal state, derived data, and effects as synchronization boundaries.
- W3C TAG, [Web Platform Design Principles](https://www.w3.org/TR/design-principles/):
  usable, consistent platform and API design.
- Jeremy Keith, [Resilient Web Design](https://resilientwebdesign.com/): user
  needs, layered capability, and progressive enhancement.
