# Established Methods and Implementation Paths

Use this reference to connect the skill's engineering ideas to published methods
and their concrete implementation procedures. Follow the relevant original method
or official framework mechanism, then adapt it to the project's actual contracts.
The entries below are a navigation and application guide, not newly invented
patterns or a replacement framework.

## Contents

- [Choose from published methods](#choose-from-published-methods)
- [Design principles and contracts](#design-principles-and-contracts)
- [Modularity and reuse](#modularity-and-reuse)
- [Collaboration patterns](#collaboration-patterns)
- [Domain logic and dependency boundaries](#domain-logic-and-dependency-boundaries)
- [Control and dependency composition](#control-and-dependency-composition)
- [Domain models and data flow](#domain-models-and-data-flow)
- [State and type modeling](#state-and-type-modeling)
- [Effects and concurrency](#effects-and-concurrency)
- [Forms and URL state](#forms-and-url-state)
- [Remote data and mutation lifecycle](#remote-data-and-mutation-lifecycle)
- [Interface composition and interaction](#interface-composition-and-interaction)
- [Layout and motion](#layout-and-motion)
- [Runtime and performance](#runtime-and-performance)
- [Recovery and evolution](#recovery-and-evolution)
- [Security and public artifacts](#security-and-public-artifacts)
- [Decisions and verification](#decisions-and-verification)

## Choose from published methods

Distinguish a formal specification, an author's design method, and a particular
framework/library's documented mechanism. Their authority and scope differ.
An engineering principle can have several established implementations; select
from the actual problem, existing architecture and supported runtime. Do not
claim that one library, directory tree or local business example is the universal
standard for that principle.

For a consequential choice, retain the established method's name and primary
source, its implementation steps, the applicable boundary, and how the project
uses it. Consult the relevant source example when mechanics remain unclear.
Use the project's existing implementation first; verify version-sensitive APIs
when unsettled, without repeating source research for a settled local edit.

Apply the published procedure to real code and callers, then verify the required
behavior. Separate the source method from project-specific adaptations. Do not
invent a method name or an industry mandate to fill a missing source. Where no
single prescribed implementation exists, state the relevant alternatives and
project reasoning. Do not force every method below into every task.
This navigation is not an exhaustive catalogue. When a real decision falls
outside it, investigate the relevant established concepts and source methods;
do not wait for the user to enumerate their names.

## Design principles and contracts

Use [SOLID](design-principles.md#apply-solid-to-the-responsible-boundary) to resolve
responsibility, extension, substitution and client-interface questions. Use
[information hiding](design-principles.md#hide-decisions-that-consumers-should-not-know)
for knowledge boundaries, [Design by Contract](design-principles.md#make-obligations-explicit-with-design-by-contract)
for caller/supplier obligations, and [DRY/YAGNI](design-principles.md#apply-dry-and-yagni-to-knowledge-and-capability)
for authoritative knowledge and speculative capability. The same topic covers
least knowledge / Law of Demeter. These named methods refine a relevant decision;
they do not create a five-layer architecture or a quota of abstractions.

## Modularity and reuse

**Colocation and Feature-Sliced Design — author guidance and a documented
architecture methodology.** [Colocation](https://kentcdodds.com/blog/colocation)
places related code near its use. If FSD fits the application, its
[layers](https://feature-sliced.design/docs/reference/layers) and
[public API](https://feature-sliced.design/docs/reference/public-api) provide
concrete dependency rules: organize domain slices, expose intentional exports,
and follow its layer/public-API import rules, including documented cross-import
exceptions. Add only useful layers and preserve the App/Shared exceptions. Borrowing
colocation alone does not mean the project implements FSD; retain the framework's
routing and repository conventions. See [module boundaries](module-boundaries.md#establish-ecosystem-conventions-first).

**AHA and the wrong abstraction — author methods.** Use
[AHA Programming](https://kentcdodds.com/blog/aha-programming) to wait for understood
shared semantics rather than abstracting visual/code similarity. For an existing
wrong abstraction, Sandi Metz gives a concrete recovery in
[The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction):
inline it into callers, specialize each caller from its actual parameters,
remove irrelevant branches, then reconsider what still merits extraction.
This is conditional recovery, not a ban on early small seams or ordinary branches.
See [abstraction timing](architecture-and-code.md#abstract-at-the-right-time).

**Extract Function and Split Phase — named refactorings.** Fowler's
[Extract Function](https://refactoring.com/catalog/extractFunction.html) moves a
coherent operation behind a meaningful call; [Split Phase](https://refactoring.com/catalog/splitPhase.html)
separates stages using explicit intermediate data, such as parsing before
calculation. Apply these where the original mixed operation obscures a real
responsibility; preserve behavior and inspect all affected callers. They do not
require an extra file or wrapper for every line. See
[readable operations](architecture-and-code.md#construct-a-readable-operation).

## Collaboration patterns

Use [the collaboration guide](collaboration-patterns.md#contents) for Strategy,
Specification, factory choices, Adapter, Facade, Decorator, Chain of Responsibility,
Observer, Command and Composite when their relationships match the actual problem.
It links the original catalogue, author papers and concrete official mechanisms.
Select the collaboration before its class/function representation and verify its
contract through callers; copying a pattern name or diagram is not application.

## Domain logic and dependency boundaries

**Functional Core, Imperative Shell — Gary Bernhardt's design approach.**
[Boundaries](https://www.destroyallsoftware.com/talks/boundaries) explains boundaries
based on simple values and links the original functional-core/imperative-shell
material. Put deterministic rules and transformations behind value-based inputs
and results; let the surrounding code acquire external data and perform effects.
Verify the rules directly and the shell through actual integrations. Preserve
existing event/effect ownership; this approach does not require pure wrappers
around every statement. See [paradigm choices](programming-paradigms.md#use-a-functional-core-and-imperative-shell-by-default).

**Ports and Adapters — published architecture pattern.**
Cockburn's [original Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture)
defines application-facing ports and technology-specific adapters. Use it for a
real external/substitution boundary and preserve its dependency direction; a
local capability contract can suffice without adopting a complete hexagonal
structure. See [owned boundaries](module-boundaries.md#hide-complexity-not-just-code).

## Control and dependency composition

IoC, DIP, DI, Pure DI, Composition Root, an IoC/DI container and Service Locator
answer different questions about control, dependencies and assembly. Use
[dependency composition](dependency-composition.md#distinguish-the-concepts) for
their original sources and relationships, then
[choose the mechanism](dependency-composition.md#choose-the-composition-mechanism)
and apply the published assembly procedure. Cover runtime tokens, scope ownership
and release as well as construction. A framework's injector is a valid existing
capability; explicit manual composition is also a complete DI implementation.

## Domain models and data flow

Use [domain and data-flow guidance](domain-and-data-flow.md#contents) when vocabulary,
identity/value semantics, external models or presentation behavior need explicit
boundaries. It connects ubiquitous language, bounded context, entity/value object,
aggregate, anti-corruption layer, Presentation Model/MVVM, unidirectional flow and
structural sharing. Distinguish CQS, CQRS and Event Sourcing before applying any
of them; a read/write function split or event log alone does not establish those
architectures. Preserve the actual service's authority and consistency contract.

## State and type modeling

**Minimal state and a single owner — framework design guidance.** React's
[Thinking in React](https://react.dev/learn/thinking-in-react) gives the concrete
sequence: establish component hierarchy, build a static view, identify minimal
state, locate its owner, then connect inverse data flow. Its
[state-structure guide](https://react.dev/learn/choosing-the-state-structure)
explains grouping co-updated values and removing redundant or contradictory
state. Apply the equivalent reactive primitives in other frameworks; filtered
results are normally derived rather than synchronized into another writable store.
See [state modeling](architecture-and-code.md#model-data-and-state).

**Reducer; discriminated union; statechart — different established mechanisms.**
React's [reducer procedure](https://react.dev/learn/extracting-state-logic-into-a-reducer)
replaces state-setting handlers with dispatched actions, implements a pure reducer,
and connects it to the component. TypeScript's
[discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
represent variants through a shared literal discriminator and support exhaustive
handling with `never`. For complex event/state behavior, the W3C
[SCXML Recommendation](https://www.w3.org/TR/scxml/) specifies statecharts with
states, transitions, events, conditions and entry/exit actions. Choose the needed
mechanism; a union does not define transition legality, and a reducer is not
automatically a statechart. A simple toggle needs neither a statechart engine nor
SCXML serialization. See [representation choices](programming-paradigms.md#prefer-data-plus-a-reducer-or-state-machine-when).

## Effects and concurrency

**Setup/cleanup and stale-result suppression — framework-documented mechanisms.**
React's [effect guide](https://react.dev/learn/synchronizing-with-effects) pairs
external synchronization with cleanup, including aborting a fetch or ignoring
obsolete results. Vue's [watcher cleanup](https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup)
registers invalidation cleanup for stale work; obey the documented registration
timing of the selected API/version. Connect acquisition and cleanup to the actual
owner. Apply obsolescence to errors and state-changing cleanup too; transport
cancellation alone is not server rollback. See
[execution and publication](async-and-lifecycles.md#separate-execution-from-publication).

**Switching, sequencing and ignoring concurrent activation — RxJS operator
semantics.** The maintainers' implementations document
[switchMap](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/switchMap.ts),
[concatMap](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/concatMap.ts)
and [exhaustMap](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/exhaustMap.ts).
`switchMap` switches publication to the newest inner observable; `concatMap`
processes inner observables sequentially; `exhaustMap` ignores new activation while
the current inner observable remains active. Match that meaning to search, ordered
work or ignored duplicate activation, then connect subscription teardown and errors.
Use the installed RxJS version if the project already uses it; otherwise use the
existing query/command facility with the required semantics. These references do
not justify installing RxJS for one handler or claim server idempotency. See
[async policy](async-and-lifecycles.md#choose-policy-from-the-operation).

## Forms and URL state

**Native form processing — WHATWG HTML Standard.** The
[disabled-control rules](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#enabling-and-disabling-form-controls:-the-disabled-attribute)
exclude disabled controls from constraint validation; the
[entry-list algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-entry-list)
defines participation in submission. Prefer native form semantics, `FormData`
and the existing form library's supported processing where applicable. Keep
validation and submission consistent with the chosen contract. A schema-driven
object API still needs its documented field types and eligibility; the HTML
algorithm does not prescribe required-value semantics for arbitrary JavaScript
objects. See [forms](architecture-and-code.md#model-forms-and-navigation-state).

**URL parsing and serialization — WHATWG URL Standard.** Use the
[URLSearchParams interface](https://url.spec.whatwg.org/#interface-urlsearchparams)
and the project's router for encoding/decoding and navigation. Keep the domain
parser responsible for valid filter values and defaults; connect it to initial
navigation, user changes and back/forward behavior. The standard handles URL
representation, not the application's history or validation policy. See the
[URL ownership guidance](architecture-and-code.md#model-forms-and-navigation-state).

## Remote data and mutation lifecycle

**Query identity, cancellation and invalidation — documented data-layer mechanisms.**
TanStack Query's [query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
include the variables determining the data. Its
[cancellation guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
passes the supplied signal to supported transport; consume it when transport
cancellation is needed, since unused/inactive queries are not simply guaranteed
to stop. The [mutation invalidation procedure](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
connects mutation success to affected queries. Follow the installed data layer's
actual lifecycle; awaiting a returned success-callback promise can extend pending
status. Track authoritative command confirmation and a fallible follow-on read
according to the product contract, without relabeling read failure as an undone
write. This is an application obligation, not a separately invented pattern.
See [error ownership](async-and-lifecycles.md#keep-errors-actionable-and-owned).

**Optimistic UI or cache updates — documented alternatives.** TanStack Query's
[optimistic-update guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
shows temporary UI from pending mutation variables, or a cache path with cancellation,
snapshot, optimistic update, rollback and subsequent invalidation. Choose the
approach the data ownership needs. Its simple rollback example is not proof of
correctness for overlapping writes; preserve authoritative versions and newer
intent under the application's concurrency contract. See
[optimistic reconciliation](async-and-lifecycles.md#reconcile-optimistic-state-with-acknowledgements).

## Interface composition and interaction

**Atomic Design — Brad Frost's design-system methodology.** The
[original method](https://atomicdesign.bradfrost.com/chapter-2/) relates atoms,
molecules, organisms, templates and pages as interacting levels of composition.
Build stable controls and combinations, use templates for structural relationships,
and exercise them with real page content. Retain product-specific decisions in
their feature owner. These levels describe composition, not mandatory folders
or a requirement to create five wrappers. See
[component-system boundaries](interface-and-motion.md#choose-component-system-boundaries).

**WAI-ARIA APG patterns — official implementation guidance, not a complete
conformance specification.** The [modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
specifies focus entry, contained Tab/Shift+Tab navigation, Escape, accessible
naming and focus restoration. Select the pattern for the actual widget, use an
established accessible primitive when available, and verify that behavior in the
browser with the real content. Matching a role alone does not implement the
pattern or prove WCAG conformance. See
[interaction contracts](interface-and-motion.md#specify-interaction-as-behavior).

## Layout and motion

**Progressive enhancement and intrinsic sizing — documented design approach and
platform specification.** GOV.UK's [progressive-enhancement procedure](https://www.gov.uk/service-manual/technology/using-progressive-enhancement)
starts with working HTML, then adds CSS and JavaScript enhancements. CSS Grid's
[track repetition and sizing](https://www.w3.org/TR/css-grid-2/#auto-repeat)
provide concrete primitives such as `auto-fit` and `minmax()` for content/space-aware
layout. Choose supported primitives from content constraints; test long text,
zoom and narrow space rather than copying a fixed viewport screenshot. Neither
source requires every product to become a server-rendered form or use Grid.
See [layout](interface-and-motion.md#design-layout-from-content-and-constraints).

**FLIP — Paul Lewis's published animation technique.** Follow the
[original First/Last/Invert/Play procedure](https://aerotwist.com/blog/flip-your-animations/):
measure initial geometry, apply the final layout, measure again, calculate the
inverse transform, and animate away that inversion. Use it when a spatial layout
relationship needs runtime geometry mapping; prefer a simpler supported transition
when it already expresses the behavior. Integrate interruption, cleanup and reduced
motion using the chosen host's mechanism. The original historical frame guidance
is not a universal device budget. See
[FLIP application](interface-and-motion.md#apply-flip-deliberately).

## Runtime and performance

**Server/client placement and HTTP caching — framework mechanisms and protocol
standard.** React's [Server Components](https://react.dev/reference/rsc/server-components)
separate pre-bundling server execution from client interactivity; use the selected
framework's serialization and client-boundary rules rather than inventing a runtime.
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) defines HTTP cache storage,
freshness and validation; use its directives and validators for HTTP caches.
Do not apply HTTP cache directives as though they were an in-memory query cache's
API, or assume React mechanisms apply unchanged to native platforms. See
[runtime boundaries](runtime-and-delivery.md#map-environments-before-components).

**RAIL, Core Web Vitals and runtime profiling — published performance guidance.**
[RAIL](https://web.dev/articles/rail) separates response, animation, idle and load.
The same official page recommends [Core Web Vitals](https://web.dev/articles/vitals)
for current web performance goals. Select applicable metrics, gather representative
field/lab evidence, locate the expensive stage with the actual platform profiler,
then compare the unchanged baseline and corrected implementation. Use the existing
[native-platform references](rendering-app.md#primary-references) for native work;
web metrics and historical 60 Hz assumptions are not universal cross-platform
criteria. See [performance contracts](rendering-and-performance.md#define-the-performance-contract).

## Recovery and evolution

Use [bounded retry and idempotency](async-and-lifecycles.md#bound-retries-by-semantics-and-budget)
for credible transient failures, preserving submitted input, authoritative effect
and cancellation. Use [Strangler Fig or Branch by Abstraction](runtime-and-delivery.md#migrate-through-an-established-seam)
for a real incremental replacement, with consumer checks and retirement. Reuse
the existing client, host and release mechanisms; these methods do not mandate
a new resilience framework or migration runtime.

## Security and public artifacts

**Contextual output encoding, sanitization and safe sinks — OWASP guidance.** The
[XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
distinguishes output contexts, HTML sanitization and safe DOM sinks. Trace the
actual untrusted source to its sink, use framework escaping/text APIs where
appropriate, and use a maintained sanitizer when HTML must be accepted. Preserve
server authorization separately; escaping is not authorization and CSP is not
a replacement for correct output handling. See
[trust boundaries](security-and-trust.md#trace-data-from-source-to-sink).

**Package exports, SemVer and host plugin contracts — published specifications
and official APIs.** [Node package entry points](https://nodejs.org/api/packages.html#package-entry-points)
define public exports; [SemVer](https://semver.org/spec/v2.0.0.html) relates declared
public API compatibility to version changes. [Vite's plugin API](https://vite.dev/guide/api-plugin)
documents its host hooks and recommends checking built-in capabilities first.
Use the actual supported host version, declare only needed entry points/artifacts,
and exercise the packed output from real consumers. These contracts do not
justify writing a new resolver, build pipeline or compatibility system. See
[public-artifact verification](frontend-infrastructure.md#verify-the-public-artifact).

## Decisions and verification

**Architecture Decision Records — Michael Nygard's documented method.** His
[original ADR article](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
records a significant decision with context, status and consequences, retaining
superseded decisions. Use the project's record location and conventions rather
than requiring a new archive for every edit. An ADR explains a choice; it does
not replace implementation contracts or the skill's technical-design deliverable.
See [lasting knowledge](architecture-and-code.md#preserve-domain-knowledge-and-decisions).

**Consumer-oriented testing — published testing guidance.** Kent C. Dodds's
[Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
explains how private-state assertions can miss defects and break under safe
refactors. Check the operation through its public consumer, including the failure
that matters to the chosen method. Use browser/device checks for runtime claims;
a source citation or method name does not establish successful implementation.
See [observable contracts](verification-and-review.md#test-observable-contracts).
For independently evolving messages or a broad invariant-rich input space, use
[consumer-driven contract or property-based testing](verification-and-review.md#choose-contract-or-property-checks-when-useful)
where it provides evidence existing checks lack.
