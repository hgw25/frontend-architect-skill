# Programming Paradigm Decisions

Use this reference when choosing between functional programming and
object-oriented design, deciding whether to introduce classes, reducers,
closures, state machines, or imperative adapters, or reviewing mixed-paradigm
frontend code.

## Choose per boundary, not per project

Functional programming and object-oriented programming are tools for different
forms of complexity. Do not label an entire frontend codebase as purely FP or
purely OOP unless the language or framework genuinely requires it.

Ask what the current unit needs to express:

- deterministic transformation;
- explicit state transitions;
- stable identity over time;
- protected invariants;
- resource ownership and lifecycle;
- orchestration of external side effects.

Prefer the representation that makes those properties visible and testable.

## Use a functional core and imperative shell by default

Most frontend systems benefit from:

```text
events / network / DOM / storage
             ↓
       imperative shell
             ↓
 pure domain transformations
             ↓
       imperative shell
             ↓
        rendered effects
```

Keep calculations, validation, parsing, selectors, reducers, policy evaluation,
and state transitions pure when practical. An authorization policy may be a pure
function, but its authoritative execution belongs in a trusted server
environment; a browser evaluation can only guide presentation. Keep browser
APIs, network calls, timers, subscriptions, framework lifecycle, and DOM mutation
in a thin explicit shell.

This is a direction, not a demand that every helper be mathematically pure.
Copying large structures or threading dependencies through many layers can cost
more than carefully contained mutation.

## Prefer functions and plain data when

- the same inputs should produce the same output;
- logic is a transformation, predicate, validation, or calculation;
- state transitions should be serializable, replayable, or easy to inspect;
- behavior does not require stable object identity;
- composition of small operations remains easier to read than a stateful object;
- framework-native functions, hooks, composables, or signals already model the
  lifecycle clearly.

Examples include price calculation, form validation, mapping API data to view
models, reducers, selectors, trusted-environment authorization policy, and
animation geometry.

Avoid functional style that obscures the algorithm through point-free chains,
custom combinator vocabularies, excessive currying, or nested immutable copies.
Pure code is useful because it reduces hidden context, not because it uses the
most abstract syntax.

## Prefer an object or class when

- one thing has stable identity and evolves over time;
- related operations must preserve invariants around private mutable state;
- construction and cleanup own a real resource;
- consumers need polymorphic behavior behind a small stable interface;
- an imperative browser or third-party API is naturally wrapped by an adapter;
- many functions would otherwise pass the same evolving state and dependencies
  through every call.

Examples may include an editor session, media controller, canvas scene object,
Web Component, connection manager, or adapter around an imperative SDK.

A class is not justified merely because data has several fields or functions
share a noun. Do not create DTO classes with getters and setters but no invariant
or meaningful behavior. Avoid deep inheritance trees; prefer composition and
delegation unless substitutability and the extension contract are genuinely
stable.

## Prefer data plus a reducer or state machine when

- transitions are more important than object identity;
- valid and invalid states must be explicit;
- events need logging, replay, persistence, or deterministic tests;
- concurrent or asynchronous transitions are difficult to reason about;
- multiple UI consumers need the same transition model.

Use a simple reducer for straightforward transitions. Use a state machine when
guards, parallel states, interruption, or illegal transitions create real
complexity. Do not introduce a state-machine library for a local boolean toggle.

## Prefer closures or framework-native modules when

- state is local to one component or feature;
- lifecycle is already defined by the framework;
- behavior needs encapsulation but not an exported class identity;
- dependencies can be captured explicitly without hidden global state;
- the returned API is small and its cleanup remains visible.

Hooks and composables can hide mutable state just as classes can. Review stale
closures, cleanup, reactivity, and dependency ownership rather than assuming a
function automatically means functional programming.

## Decision matrix

| Dominant concern | Usually start with |
| --- | --- |
| Pure calculation or transformation | Pure function |
| Explicit serializable transitions | Reducer or data + functions |
| Complex legal/illegal transitions | State machine |
| Local framework lifecycle | Hook, composable, signal, or scoped module |
| Stable identity with guarded mutable invariants | Object/class |
| External imperative SDK or browser resource | Object/class or closure adapter |
| Cross-boundary data exchange | Plain serializable values |
| Variable behavior | Function strategy or composed interface before inheritance |

Then test the choice:

1. Can a maintainer see where state changes?
2. Can the core behavior be tested without browser, network, or framework setup?
3. Are invariants protected rather than merely documented?
4. Is identity required, or did the design invent it?
5. Are side effects explicit at the boundary?
6. Does the chosen style fit the local framework and team vocabulary?

## Combine paradigms deliberately

A strong design may use all of the following:

```ts
type EditorState = {
  content: string
  selectionStart: number
  selectionEnd: number
}

function applyInsertion(
  state: EditorState,
  text: string,
): EditorState {
  const { content, selectionStart, selectionEnd } = state

  if (
    selectionStart < 0 ||
    selectionEnd < selectionStart ||
    selectionEnd > content.length
  ) {
    throw new RangeError('Selection is outside the editor content')
  }

  const nextContent =
    content.slice(0, selectionStart) + text + content.slice(selectionEnd)
  const nextCursor = selectionStart + text.length

  return {
    content: nextContent,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  }
}

class EditorSession {
  private state: EditorState

  constructor(initial: EditorState) {
    this.state = { ...initial }
  }

  get snapshot(): Readonly<EditorState> {
    return { ...this.state }
  }

  insert(text: string): void {
    this.state = applyInsertion(this.state, text)
  }
}
```

Here the session owns evolving state and delegates one deterministic transition;
it does not need a base class, repository or event bus. In a component that already
owns this state, calling the pure transition directly may be simpler than adding
the session. For real resources, acquisition and cleanup need a complete owned
lifecycle; see [async-and-lifecycles.md](async-and-lifecycles.md) when that decision
is material. A class name alone does not establish ownership or safe cleanup.

## Review smells

Functional-design smells:

- a pipeline requires domain experts to decode its syntax;
- immutable updates repeatedly copy large structures without measurement;
- side effects are hidden inside functions presented as pure;
- dependency threading makes every function signature unstable;
- callbacks and closures obscure lifecycle or cancellation.

Object-oriented-design smells:

- deep inheritance and fragile base classes;
- God objects that own UI, data access, state, and orchestration;
- getters/setters around an anemic data bag;
- hidden mutation and temporal call-order requirements;
- methods detached from their instance or surprising `this` behavior;
- interfaces created for every class without an actual substitution boundary.

Mixed-design smells:

- the same state is owned by both an object and a reactive store;
- conversions between class instances and plain data dominate the feature;
- framework lifecycle and object lifecycle compete;
- callers cannot tell whether a method mutates, returns a new value, or performs
  I/O.

## Influences

- Gary Bernhardt, [Boundaries](https://www.destroyallsoftware.com/talks/boundaries):
  simple values at system boundaries and functional core/imperative shell.
- Kent C. Dodds,
  [Classes, Complexity, and Functional Programming](https://kentcdodds.com/blog/classes-complexity-and-functional-programming):
  choose simple functions and objects when class mechanics add cognitive cost.
- React documentation,
  [Keeping Components Pure](https://react.dev/learn/keeping-components-pure):
  predictable rendering through pure calculations.
- Refactoring.Guru,
  [Replace Inheritance with Delegation](https://refactoring.guru/replace-inheritance-with-delegation):
  prefer delegation when inheritance does not represent genuine substitutability.
