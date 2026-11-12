# Established Collaboration Patterns

Use the section matching a real variation, integration, notification or operation
problem. The original GoF catalogue is
[Design Patterns](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780321770462)
by Gamma, Helm, Johnson and Vlissides. These are design patterns, not platform
standards or mandatory classes. Prefer the project's existing implementation;
adapt representation to the language without changing the pattern's semantics.

## Contents

- [Vary a policy or express eligibility](#vary-a-policy-or-express-eligibility)
- [Choose how objects are created](#choose-how-objects-are-created)
- [Translate or simplify a capability](#translate-or-simplify-a-capability)
- [Wrap behavior or route a request](#wrap-behavior-or-route-a-request)
- [Notify observers with an owned subscription](#notify-observers-with-an-owned-subscription)
- [Represent operations and undo](#represent-operations-and-undo)
- [Apply one operation to a tree](#apply-one-operation-to-a-tree)

## Vary a policy or express eligibility

**Strategy.** Supply an interchangeable policy through the consumer's required
contract and select it at the owning composition boundary. Eric Evans's
[policy example](https://www.informit.com/articles/article.aspx?p=102604&seqNum=4)
shows a named domain rule expressed as Strategy. A typed function can represent
one algorithm; an object can hold related operations or necessary identity.
Keep the invariant workflow with its owner and verify supported policies through
the same real caller. Avoid a strategy registry when two clear branches are
easier to understand, or when the variants do not share a meaningful contract.

**Specification.** Evans and Fowler's
[original paper](https://www.martinfowler.com/apsupp/spec.pdf) separates the matching
rule from the candidate. Choose a hard-coded predicate, a parameterized rule or
composed specifications from actual needs. For shared eligibility, use the same
owned rule in selection, validation and command admission where their semantics
agree. Keep presentation messages separate when callers need different feedback.
Composition should express real combinations such as conjunction, not introduce
a configurable expression interpreter for a single predicate. Test boundary values
and all paths that apply the shared rule.

## Choose how objects are created

**Factory Method** lets a creator vary the product through its creation operation;
**Abstract Factory** supplies a related family of products. The GoF's
[Abstract Factory excerpt](https://www.informit.com/articles/article.aspx?p=1398599)
describes the family contract and supported products. Choose a family boundary
when implementations must remain compatible as a set; use an ordinary factory
function when the need is simply deferred or configured creation of one value.
Do not call every callback the GoF Factory Method pattern.

Keep creation parameters and resource ownership explicit. Wire the factory where
configuration is known, use the returned capability at real consumers, and verify
compatible products and cleanup. Existing DI providers may already supply the
needed construction; see [dependency composition](dependency-composition.md#apply-the-published-assembly-procedures).

## Translate or simplify a capability

**Adapter** converts an existing interface to the one its consumer needs; the
[GoF excerpt](https://www.informit.com/articles/article.aspx?p=1398600)
explains that relationship. Locate the incompatible external contract, implement
the consumer-facing interface, and translate inputs, outputs and relevant errors
at that boundary. Verify both mapping and actual consumption; a type assertion
is not conversion or external validation.

**Facade** exposes a cohesive simpler interface to a subsystem. Use it where
consumers should not coordinate the subsystem's internal sequence. It need not
change the underlying interfaces as an adapter does. Keep important effects,
confirmation and errors visible in its contract. A renamed forwarding call with
the same leaked protocol has not achieved this boundary. For domain meaning
translation, also consider [an anti-corruption layer](domain-and-data-flow.md#keep-contexts-and-external-models-distinct).

## Wrap behavior or route a request

**Decorator** adds behavior by wrapping the same supported interface and delegating
to its wrapped collaborator. Use it for composable responsibilities whose caller
contract remains valid. Make wrapper order and ownership visible and check that
errors, cancellation and resource release retain the intended semantics.

**Chain of Responsibility** passes a request among candidate handlers until one
handles it; the [original GoF excerpt](https://www.informit.com/articles/article.aspx?p=1398601)
defines that routing. Establish order, handle-versus-forward decisions and the
unhandled outcome, then exercise the real chain. A mandatory all-stages pipeline
has different semantics; follow the installed middleware/interceptor contract
rather than applying the name to every sequence. Neither pattern justifies hidden
retries, duplicate notifications or generic middleware for one local branch.

## Notify observers with an owned subscription

**Observer** separates a changing subject from its subscribed consumers. For a
browser event boundary, the [DOM EventTarget specification](https://dom.spec.whatwg.org/#interface-eventtarget)
provides listener registration, dispatch and removal. Existing observable/store
subscriptions can provide the equivalent needed notification mechanism.

Define the event/value, subscribe at the actual owner, publish the meaningful
change and release that registration on teardown. Preserve the chosen mechanism's
ordering, error and reentrancy semantics. A distributed publish/subscribe system
is not automatically equivalent to an in-process observer: delivery, buffering
and failures can differ. For one direct request/result, a direct capability call
may remain clearer than a global event bus. Check independent subscriber cleanup
and late events using [lifecycle policy](async-and-lifecycles.md#own-acquisition-replacement-and-release).

## Represent operations and undo

**Command** represents an invocation with its needed input and receiver. This can
unify toolbar/keyboard invocation or support queuing/history; it does not require
a class for every click. Qt's official
[undo-command implementation](https://doc.qt.io/qt-6/qundocommand.html)
illustrates execute/undo/redo, grouping and optional merging. It is an implementation
reference, not a dependency recommendation for a web project.

Capture the submitted input, execute through the responsible domain operation,
and record an undoable change only at the appropriate successful boundary. If
undo is required, specify its inverse or retained state, history scope, redo
invalidation and grouping. Check execute–undo–redo and intervening edits. A local
history entry does not undo an authoritative remote write; that needs its actual
service/recovery contract. Ordinary commands, CQS and Event Sourcing are distinct;
see [read/write and history](domain-and-data-flow.md#distinguish-cqs-cqrs-and-event-sourcing).

## Apply one operation to a tree

**Composite** gives leaves and groups a shared meaningful operation. Use it for
owned trees such as editor layers or nested documents when consumers should
traverse or operate uniformly. Decide what belongs in the common contract,
delegate group work to children, and preserve ordering and ownership.

Do not force leaf nodes to implement invalid child-management operations or
pretend every component hierarchy is the GoF Composite pattern. Exercise mixed
and nested nodes through the consumer contract; use
[LSP and ISP](design-principles.md#apply-solid-to-the-responsible-boundary)
to keep that common operation honest.
