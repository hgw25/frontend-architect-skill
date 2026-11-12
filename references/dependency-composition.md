# Control Inversion and Dependency Composition

Use this reference when deciding who controls execution, which direction source
dependencies point, who supplies a dependency, or how instances are assembled,
scoped and released. Reuse the framework and repository's existing composition
mechanism. These are established but distinct ideas, not interchangeable names
for a container or a requirement to introduce one.

## Contents

- [Distinguish the concepts](#distinguish-the-concepts)
- [Choose the composition mechanism](#choose-the-composition-mechanism)
- [Apply the published assembly procedures](#apply-the-published-assembly-procedures)
- [Specify tokens, scopes and release](#specify-tokens-scopes-and-release)
- [Use the framework's actual mechanism](#use-the-frameworks-actual-mechanism)
- [Verify consumers and lifetime boundaries](#verify-consumers-and-lifetime-boundaries)

## Distinguish the concepts

| Idea and primary source | Question it answers | Concrete implementation consequence |
| --- | --- | --- |
| [IoC — Fowler](https://martinfowler.com/bliki/InversionOfControl.html) | Who controls invocation? | A framework invokes registered application behavior through its extension/lifecycle contract; a callback or hook can participate without a DI container |
| [DIP — Martin's original paper](https://d3s.mff.cuni.cz/f/teaching/nprg043/extras/martin96-dependency_inversion_principle.pdf) | Which way do source dependencies point? | High-level policy depends on the abstraction it needs; implementation details conform to it. Runtime control can travel in the opposite direction |
| [DI — Fowler](https://martinfowler.com/articles/injection.html) | Who supplies collaborators? | Receive dependencies from outside, through the constructor or another appropriate injection point, rather than choosing/creating concrete collaborators internally |
| [Pure DI — Seemann](https://blog.ploeh.dk/2014/06/10/pure-di/) | Must DI use a container? | Ordinary composition code supplies dependencies; there is no container requirement |
| [Composition Root — Seemann](https://blog.ploeh.dk/2011/07/28/CompositionRoot/) | Where is the application graph assembled? | Compose near the application entry point; keep composition and business use separate |
| [IoC/DI container — Register Resolve Release](https://blog.ploeh.dk/2010/09/29/TheRegisterResolveReleasepattern/) | Who automates graph assembly and supported lifetime management? | Register providers, resolve the needed entry graph, and release owned resources through the selected container's actual lifecycle |
| [Service Locator — Fowler](https://martinfowler.com/articles/injection.html) | Does the consumer ask a registry for collaborators? | The consumer depends on lookup; passing a container and calling `get` inside business operations remains locator use |

DI is one form of control inversion for dependency supply; IoC also describes
framework control over execution. DIP concerns architectural dependencies.
Injection can help implement DIP, but injecting a concrete detail does not by
itself invert the source dependency. A small existing value or function contract
can be sufficient; these distinctions do not require an interface per class.

## Choose the composition mechanism

First inspect bootstrap code, providers, factories, consumers and resource owners.
Follow the existing framework's composition model when it fits. Consider three
choices using actual graph variability and lifetime needs:

| Situation | Suitable existing approach | Reason |
| --- | --- | --- |
| A small explicit graph with a known replacement boundary | Pure DI at the application composition point | Dependencies and construction order stay visible; a function parameter or constructor can supply the needed capability |
| A framework already provides hierarchical injection and providers | Its supported injector/provider mechanism | Reuses registration, visibility, overrides and lifecycle rather than maintaining a competing registry |
| Repeated assembly, convention-based registration or scoped graphs create real maintenance work | A suitable maintained container, with explicit scope and release policies | Can centralize repeated graph construction and supported lifetime handling; the gain must apply to this graph |

Seemann's [container-selection discussion](https://blog.ploeh.dk/2012/11/06/WhentouseaDIContainer/)
compares explicit composition with convention-based configuration. Treat that as
decision guidance, not a rule based on class count. Container use is a legitimate
solution when it earns its place; manual DI is also a complete solution. Shared
semantics, scope and wiring effort matter more than whether code uses classes.

## Apply the published assembly procedures

**Pure DI and injection forms.** Identify the collaborator contract, expose the
required dependency at construction or the relevant call boundary, compose its
implementation near application startup, then pass it to consumers. Fowler's
[injection forms](https://martinfowler.com/articles/injection.html) distinguish
constructor, setter and interface injection. Use the form fitting the host's
construction contract; keep mandatory dependencies available before use. Own
resource acquisition and release at their actual lifetime boundary.

**Container composition.** Follow the established
[Register Resolve Release procedure](https://blog.ploeh.dk/2010/09/29/TheRegisterResolveReleasepattern/):

1. Register each required token/contract with its implementation, value, alias or
   factory. Set the intended scope and supply its actual dependencies.
2. At application startup or a supported framework scope entry, resolve the
   application/feature entry graph and let consumers use supplied collaborators.
3. When the owned scope ends, release that graph/resources using the documented
   mechanism. Releasing one graph and destroying the entire container can differ.

Follow the container's official examples for the installed version, including
async factories and disposal if relevant. Do not implement another resolver,
decorator system or lifetime engine to demonstrate the principle.

The [Composition Root method](https://blog.ploeh.dk/2011/07/28/CompositionRoot/)
keeps a general-purpose container out of business modules. Frameworks also have
their own supported injection contexts and scoped provider entry points. Use
those contracts as intended; a framework-native injection call is not by itself
a defect. Avoid passing a generic registry through domain code when consumers
can name the capabilities they need. A typed factory can supply an instance
whose creation genuinely belongs to a later event without exposing the registry.

## Specify tokens, scopes and release

These are application of the chosen container's contract, not universal meanings
that can be inferred from a scope name:

- **Runtime identity.** A TypeScript interface is not a runtime registration key.
  Reuse the framework's token convention. Angular's
  [provider guide](https://angular.dev/guide/di/defining-dependency-providers)
  uses `InjectionToken` for non-class contracts; its descriptive string is not
  token identity. Register and consume the same token object.
- **Provider behavior.** Distinguish constructing a class, supplying an existing
  value, calling a factory and aliasing another provider. The same Angular guide
  distinguishes `useClass`, `useValue`, `useFactory` and `useExisting`; an alias
  can preserve an existing instance where a new class provider creates another.
- **Scope ownership.** Define which application, editor, route, tenant or server
  request owns each instance. A long-lived object must not accidentally retain a
  shorter-lived user's state. Shared stateless policy and per-editor mutable
  state can need different owners even when both are services.
- **Actual caching semantics.** Inversify's
  [binding documentation](https://inversify.io/docs/fundamentals/binding/)
  defines request scope around one `container.get` resolution, not automatically
  an HTTP request. Explicitly establish the real request boundary when needed;
  names such as singleton, scoped and request are not portable guarantees.
- **Release responsibility.** Determine which resources the injector/container
  owns and which it borrows. Use its supported deactivation/disposal and framework
  cleanup. Ending one child scope must not close a parent's shared connection;
  unregistering a binding does not universally imply disposing every instance.

For SSR, apply the existing [runtime scope model](runtime-and-delivery.md#map-environments-before-components):
keep identity-bearing request data out of process-wide shared instances. A
container is an assembly tool, not an authorization or isolation guarantee.
Verify request setup and teardown through the real server integration when
claiming that isolation holds.

## Use the framework's actual mechanism

- **Angular:** use its
  [hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)
  and provider configuration at the owner whose visibility and lifetime match
  the service. Root/application and component/editor instances need not share
  mutable state. Respect parent resolution, local overrides and destruction;
  inspect the supported Angular version before prescribing decorators or APIs.
- **Vue:** [provide/inject](https://vuejs.org/guide/components/provide-inject.html)
  supplies dependencies through the ancestor tree, with closest-provider lookup
  and symbol keys where appropriate. Retain the documented reactive value and
  mutation ownership. Providing a value does not promise automatic construction
  or disposal of an arbitrary dependency graph.
- **React:** [context](https://react.dev/reference/react/createContext)
  passes a value through a provider boundary. An already composed service can be
  that value; construction, stable identity and external-resource cleanup still
  need their actual owners. Context alone is not a registration/resolution and
  disposal container. Props or explicit arguments remain valid for local use.
- **Standalone libraries/tools:** accept the needed dependencies through the
  public contract; let the host compose them. Use a container only where the
  supported host or independently justified assembly needs call for it.

These are mechanism correspondences, not claims that the frameworks implement
identical DI semantics or that every framework should adopt the same container.

## Verify consumers and lifetime boundaries

Inspect the assembled entry graph and an actual consumer operation, not only a
successful token lookup. Select checks from the changed contract:

- A supplied alternative implementation works through the same business caller,
  without changing domain imports or patching a global registry.
- Repeated resolution has the intended identity; independent editor/request
  scopes do not share mutable state, and a documented alias preserves identity.
- A missing/ambiguous binding or dependency cycle is exposed by existing
  container diagnostics rather than hidden by fallback globals.
- Scope teardown releases owned resources once while borrowed shared resources
  remain available; replacement/remount does not reuse a disposed instance.
- Where SSR isolation is claimed, overlapping requests with different identities
  retain their own data through actual async completion and cleanup.

Keep checks at public construction, consumer and lifecycle boundaries. They need
not inspect container internals or force a framework migration. For a realistic
follow-up, trace a second editor instance or an adapter replacement: composition
and the appropriate scope should change while existing callers keep their
required contract.
