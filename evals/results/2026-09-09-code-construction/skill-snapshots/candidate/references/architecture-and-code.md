# Architecture and Code Decisions

Use this reference for frontend architecture, state and data flow, component
boundaries, hooks/composables, utilities, TypeScript, API design, refactoring,
and dependency choices.

Use [module-boundaries.md](module-boundaries.md) instead when project or feature
organization is the dominant decision, [programming-paradigms.md](programming-paradigms.md)
for representation choices, and [runtime-and-delivery.md](runtime-and-delivery.md)
for execution, placement, cache, or delivery boundaries.

## Contents

- Understand before changing
- Construct a readable operation
- Choose data representations
- Model data and state
- Model forms and navigation state
- Place behavior by ownership
- Design components and APIs
- Abstract at the right time
- Design utilities defensively
- Route asynchronous decisions
- Use types to encode constraints
- Adapt across frameworks
- Influences

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
- preserve escape hatches only for demonstrated needs.

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

When simplifying a workflow, reassess the mechanisms rather than just removing
an option from the UI. Trace the removed behavior's state, subscriptions,
compensations, adapters, and forwarded parameters. Remove those with no remaining
requirement, preserve shared mechanisms with real consumers, and validate the
surviving interaction. Reachable code can still be unnecessary. Do not create
another configuration flag merely to keep an abandoned design alive.

## Design utilities defensively

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
  single callback API unless property-name shorthand has repeated, measured
  value.
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
