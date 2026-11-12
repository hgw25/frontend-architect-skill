# Domain Meaning and Data Flow

Use the relevant section for model ambiguity, external vocabulary, presentation
state, state-update direction or proposed read/write/history architecture. These
methods need domain and consumer evidence; a frontend feature does not require
a complete enterprise domain framework.

## Contents

- [Keep contexts and external models distinct](#keep-contexts-and-external-models-distinct)
- [Choose identity and value semantics](#choose-identity-and-value-semantics)
- [Separate presentation behavior and direct data flow](#separate-presentation-behavior-and-direct-data-flow)
- [Distinguish CQS, CQRS and Event Sourcing](#distinguish-cqs-cqrs-and-event-sourcing)

## Keep contexts and external models distinct

Eric Evans's [knowledge-driven modeling example](https://www.informit.com/articles/article.aspx?p=102604)
uses domain understanding to refine both rules and code. **Ubiquitous Language**
is the shared domain vocabulary; Fowler's
[account of Evans's method](https://martinfowler.com/bliki/UbiquitousLanguage.html)
explains making it rigorous enough for code and discussion. Use established
domain names in contracts, checks and records rather than naming only technical
steps. Resolve ambiguous identities from authoritative facts, not similar strings.

**Bounded Context** gives a model a clear meaning boundary. Fowler's
[published explanation](https://martinfowler.com/bliki/BoundedContext.html)
describes explicit relationships between distinct models. Identify where a term
or identifier changes meaning, keep each context internally consistent, and
define the actual translation between them. A route, folder or microservice is
not automatically a bounded context. Small applications can need only a few
explicit definitions and a mapping at an existing boundary.

**Anti-Corruption Layer** protects one domain model from another model's vocabulary
and semantics. The [official architecture guide](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
describes translation at that integration boundary. Reuse the owned adapter to
map identifiers, units, statuses and errors, preserving relevant information;
validate untrusted input according to the existing external contract. Use this
when meaning needs protection, not to add a second DTO copy for every response.
It need not be a separate service. Verify actual consumers and unknown mapping
behavior, keeping absent authoritative relationships unresolved.

## Choose identity and value semantics

Evans's classification, described in
[Fowler's account](https://martinfowler.com/bliki/EvansClassification.html),
distinguishes **Entity** identity across changes from **Value Object** equality
by meaningful attributes. Use an established entity identity for selection,
references and updates; an entity is not a value object merely because it is
represented immutably. For a value such as a range or money, keep its related
constraints together and choose explicit equality/immutable replacement semantics.
JavaScript reference equality does not implement value equality automatically.

A [Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
is a transport representation, not the same concept as a value object. Keep
wire representation, editable draft and confirmed domain facts distinct where
their contracts differ. Plain data, existing schemas or a small type may be
enough; do not require classes or repositories for every record.

An **Aggregate** is an invariant/consistency boundary, not a synonym for a store
containing related data. The [official domain-model guidance](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-domain-model)
describes root-controlled aggregate consistency. In a frontend, model the local
transition honestly while preserving the authoritative service's transaction
boundary. Updating several fields together in a reducer does not make several
server writes atomic. Verify invariants and authoritative confirmation separately.

## Separate presentation behavior and direct data flow

**Presentation Model / MVVM.** Fowler's
[published draft](https://martinfowler.com/eaaDev/PresentationModel.html)
separates presentation state/behavior from concrete GUI controls. Put meaningful
view coordination behind a contract consumed by the view; retain domain rules
with their domain owner. In a modern framework, a focused hook/composable or
existing view-model facility can express that separation; do not reproduce an
old widget-synchronization model or one giant page controller by convention.
Keep native focus/layout/resource work at its real runtime owner.

**Unidirectional data flow.** The
[Redux data-flow guide](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow)
follows state to view, user action to transition, then updated state back to
view. Trace one action through its owner instead of letting competing views
write derived copies. Effects belong to the established event/middleware owner;
this direction does not require installing Redux or putting local state globally.

**Immutable updates and structural sharing.** The
[official update guidance](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns)
copies each changed nesting level while retaining unchanged branches. Use the
existing immutable-update facility or explicit copies where required. Check that
old snapshots remain unchanged and unaffected branches preserve useful identity.
A shallow root copy does not protect nested mutation; deep-cloning everything
has cost and can destroy identity semantics. Derived values remain derived.

## Distinguish CQS, CQRS and Event Sourcing

| Method and source | Defining choice | Applicable implementation and limit |
| --- | --- | --- |
| [CQS — Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html) | Separate side-effect-free queries from modifying operations; the strict formulation makes commands return no value | Keep effect semantics explicit. A command returning a receipt is a pragmatic deviation from strict CQS, not a reason to discard essential confirmation |
| [CQRS](https://martinfowler.com/bliki/CQRS.html) | Use distinct models for updates and reads | Define the write model, read projection and required consistency/freshness when their needs differ materially; separate databases/services are not a prerequisite |
| [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) | Store state changes as the authoritative event history from which state can be rebuilt | Requires actual event persistence, ordering/evolution and replay policy; an action log, message bus or undo list alone is not Event Sourcing |

Select these independently and only within the relevant domain boundary. A
mutation followed by refresh does not by itself implement CQRS, and CQRS does
not require Event Sourcing. Ordinary CRUD and an owned query/mutation lifecycle
often suffice; see [confirmation and errors](async-and-lifecycles.md#keep-errors-actionable-and-owned).

Where a real separate projection exists, make stale/lagging reads observable and
preserve confirmed writes. If replay exists, keep external side effects behind
the actual replay-aware boundary so rebuilding history does not resend commands.
Use the platform/service's existing event contract; do not add an event store,
broker or cross-service architecture merely to organize a frontend form.
