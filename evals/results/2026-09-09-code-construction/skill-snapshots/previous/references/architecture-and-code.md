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
- Model data and state
- Model forms and navigation state
- Place behavior by ownership
- Design components and APIs
- Abstract at the right time
- Design utilities defensively
- Handle asynchronous boundaries
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

A focused fallback can be:

```ts
function groupBy<T, K>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>()

  items.forEach((item, index) => {
    const key = getKey(item, index)
    const group = groups.get(key)

    if (group) group.push(item)
    else groups.set(key, [item])
  })

  return groups
}
```

This is an example of decision criteria, not a mandatory implementation. Local
naming, iteration style, compatibility, and return-contract needs still apply.

## Handle asynchronous boundaries

For data-driven UI, decide explicitly:

- request ownership and cancellation;
- stale response and out-of-order completion behavior;
- cache identity and invalidation;
- optimistic update, rollback, and duplicate submission behavior;
- retry policy and whether an operation is idempotent;
- loading, empty, partial, error, offline, and permission presentation;
- whether navigation or unmounting may outlive the work.

Do not hand-roll a request cache inside components when the selected framework
already provides a suitable data layer. Do not adopt a large data library for a
single simple request without evidence that its lifecycle is needed.

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
