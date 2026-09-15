# Module Boundaries

Use this reference when deciding between feature/domain grouping and technical
role grouping, defining public module APIs, reorganizing a frontend codebase, or
reviewing dependency direction.

Use [runtime-and-delivery.md](runtime-and-delivery.md) instead when the dominant
decision is workspace packaging, build graphs, or server/client placement.

## Establish ecosystem conventions first

Inspect the framework, router, supported version, generated starter and existing
project organization. Use project conventions when suitable, then the framework's
official routing/layout/file conventions and established ecosystem practice.
Consult current official guidance for consequential unsettled assumptions; a
routine edit does not require a fresh architecture survey. A starter provides
bootstrapping, not a finished business architecture.

Common names are not interchangeable requirements: `pages` or `views` often own
route screens, `layouts` owns application shells, and `features` often owns user
capabilities that may span screens. Follow the actual framework: Next.js uses
route-local `page` and `layout` conventions; Nuxt has prescribed page and layout
directories. Neither establishes a universal React or Vue directory template.
Do not prohibit `modules`, force `features`, or add synonymous layers merely to
complete a tree. Explain a departure through concrete maintenance benefit.

Separate responsibilities before choosing their homes:

- Application entry composes routing, providers and the application shell.
- Layout owns navigation and shared page framing, without domain commands.
- Page coordinates its use case and components; it should not accumulate every
  form draft, list filter, item action and recovery interaction.
- Components own coherent presentation and interaction contracts, including
  their local state, focus and feedback. Shared state stays with its closest
  meaningful common owner; avoid both prop forwarding chains and duplicated state.
- Domain rules and data access have identifiable owners independent of rendering.

Give independently meaningful components and modules discoverable files by
default. Small private helpers may remain with their owner. Classify internals
when it helps navigation; avoid both a flat business dumping ground and empty
one-file directory hierarchies. Extract layouts when they own real shell behavior,
not solely to create another forwarding component.

Revisit these boundaries when adding substantial interactions. Neither a small
application nor lack of reuse justifies indefinite accumulation in `App` or a
page. Moving all handlers into one giant hook is the same ownership problem.

## Start with change and ownership

Do not begin with folder names. A module is a boundary around code that has a
coherent purpose, an owner, and a reason to change together.

Before choosing a structure, identify:

- the product capabilities users and stakeholders recognize;
- the data and policies each capability owns;
- the workflows that coordinate several capabilities;
- the technical foundations reused without product knowledge;
- the public contracts other modules actually need;
- the likely direction of dependencies.

The objective is change locality: an ordinary product change should touch a
small, predictable area without creating cycles or leaking internal details.

## Compare the two grouping strategies

### Grouping by technical role

Typical top-level folders are `components`, `hooks`, `services`, `stores`,
`types`, and `utils`.

This works well when:

- the codebase is small and shallow;
- the project is a focused library with one coherent capability;
- technical roles are the stable public concepts;
- a framework or toolchain imposes those boundaries;
- contributors frequently work across the entire product.

It becomes costly when one feature change requires navigating every role folder,
generic folders become dumping grounds, ownership is unclear, or unrelated
features depend on one another through shared global files.

### Grouping by feature or domain

Typical top-level modules are `checkout`, `catalog`, `identity`, or
`notifications`, each containing the UI, state, API integration, tests, and
supporting logic it owns.

This works well when:

- the application has recognizable business capabilities;
- teams or maintainers own product areas;
- features change mostly independently;
- route-level code splitting or independent delivery matters;
- product behavior should be discoverable from the project tree.

It becomes costly when every small control is promoted to a feature, shared
infrastructure is duplicated, feature boundaries do not match the domain, or
cross-feature imports become cyclic.

## Use a hybrid default for product applications

Within the framework and project conventions, group related product behavior
by ownership, with technical roles inside a boundary when they improve navigation.
A page-owned feature may stay under its page; a capability used across pages may
have a separate home. The following is one option, not the starting assumption.

```text
src/
  app/                 composition, routing, global providers
  features/
    checkout/
      api/
      model/
      ui/
      index.ts
    accountRecovery/
      api/
      model/
      ui/
      index.ts
  shared/
    http/
    date/
    ui/
```

This tree is an example, not a required template. A small feature may remain a
few colocated files without `api`, `model`, and `ui` subdirectories. Add a
segment only when it improves navigation.

Use technical grouping at the top level when the product has no meaningful
feature boundaries yet. Migrate incrementally when change patterns become
visible; do not pre-build an enterprise hierarchy for a small application.

## Refine boundaries at several scales

Module design does not stop after choosing `features/checkout`. Examine only the
scales that are large enough to need a boundary:

1. **Workspace or package:** independently consumed, built, released, or owned
   code.
2. **Application area:** routes, product domains, features, and shared platform
   capabilities.
3. **Feature internals:** composition, workflows, state and rules, external
   adapters, UI, and tests.
4. **Implementation units:** components, hooks/composables, functions, classes,
   styles, and test files.

Choose the shallowest structure that keeps ownership and dependencies obvious.
A large feature can benefit from all four scales; a small feature can remain two
or three colocated files. Detail should reveal the design, not create more
navigation than understanding.

### Divide a feature by owned responsibility

These are possible responsibilities, not required directories:

| Responsibility | What belongs there | Boundary signal |
| --- | --- | --- |
| Public entry | Supported exports for outside consumers | Consumers need a deliberate, stable contract |
| Composition | Route/page assembly and dependency wiring | Several owned parts must be coordinated without becoming mutually dependent |
| Workflow/application behavior | User commands, transitions, orchestration, and async policy | The use case has meaningful success, failure, retry, cancellation, or concurrency behavior |
| Model/domain | Domain types, invariants, selectors, reducers, and pure calculations | Rules can be expressed independently of rendering and transport |
| Data/adapters | HTTP mapping, storage, browser APIs, SDKs, subscriptions, and runtime validation | An external contract, side effect, or lifecycle must be isolated |
| UI | Semantic rendering, local interaction, accessibility, and presentation state | A visible unit has a coherent interaction or accessibility contract |
| Local support | Single-use helpers, fixtures, styles, and types | They support one owner and have no broader semantic contract |
| Tests | Behavior and contract checks colocated with the owner | The test should move and change with the behavior it protects |

For example, a checkout feature might expose only its route element and a small
command surface. Internally, pricing rules can remain pure, the checkout
submission workflow can own submission and retry transitions, coupon behavior
can own its request identity and result, inventory behavior can own its
subscription lifecycle, payment behavior can own its SDK session, and those
capabilities can be composed without transferring all their state into one
feature hook. Independently interactive form sections can own their local
accessibility behavior. This does not require creating
`model/`, `application/`, `adapters/`, and `ui/` directories before each has
enough content to improve navigation.

### Split implementation units for semantic reasons

Split a component, hook/composable, function, or file when the new unit has at
least one defensible boundary:

- a nameable responsibility with a different reason to change;
- independent state, lifecycle, cleanup, error, or accessibility behavior;
- a pure rule or state transition obscured by rendering or I/O;
- an external system boundary needing normalization, validation, or replacement;
- reuse whose semantics, not merely markup, are stable across callers;
- a public or internal contract that makes dependencies easier to understand.

Keep code together when helpers are private to one owner, change with it, and
become harder to follow after extraction. A main component and its small private
render helpers may share one file. A one-use calculation can stay near its call
site. Colocation is still modular when the ownership boundary is clear.

### Hide complexity, not just code

A useful boundary reduces what its consumers must know. It may hide a volatile
implementation decision such as a transport shape, SDK mechanism, validation or
cache policy, platform-specific lifecycle, or it may contain cohesive complexity
such as focus management, concurrency, cancellation, and resource ownership
behind a smaller stable contract.

A forwarding wrapper that only renames one call while exposing the same data,
ordering, errors, and lifecycle is not automatically a module. Keep the direct
call until the boundary owns policy, normalization, lifecycle, or a meaningful
replacement seam. Do not create an interface solely to make a thin wrapper look
architectural.

Before extracting, ask:

- What can change internally without forcing consumers to change?
- Which implementation knowledge no longer leaks through the new contract?
- Is the public surface meaningfully simpler than the behavior it provides?

If none has a concrete answer, keep the code with its current owner.

Exercise a proposed boundary with a plausible change from the actual task or
consumer history. For example, trace adding a filter, replacing a response shape,
or removing an interaction through the expected edit locations. A response-only
change should normally stay in its adapter; a changed domain rule may legitimately
affect UI and validation together. Judge whether the spread follows the rule's
ownership, not whether only one file changes. Use the exercise to revise a leaky
boundary, not to implement hypothetical features or general-purpose plugins.

Do not use line count, visual rectangles, or the ability to write a custom hook
as sufficient evidence. In particular:

- Do not turn every JSX section into a component with no behavior or semantic
  identity.
- Do not move unrelated effects into one `useFeature` hook merely to shorten a
  component; the hook must expose one coherent stateful capability. A
  feature-level coordinator can combine outputs and commands from smaller
  capabilities, but should not re-own all their state, cleanup, concurrency,
  and errors.
- Do not create `types`, `utils`, or `services` files that collect unrelated
  leftovers from the feature.
- Do not introduce dependency injection, repositories, or interface layers when
  there is no meaningful substitution, test seam, runtime boundary, or policy.
- Do not create a directory and barrel file for every implementation file.

### Make internal dependency direction visible

Within a substantial feature, prefer a dependency story that can be explained
in one direction:

```text
public entry -> composition
composition -> UI, workflows, external adapters
UI -> workflows and model
workflows -> model and focused ports
external adapters -> focused ports and platform capabilities
model -> no UI, transport, or platform dependencies
```

Composition may wire an adapter to a workflow. Pure model code should not import
UI, transport, browser globals, or framework lifecycle code. Adapters should not
decide presentation. UI should receive domain-relevant values and actions rather
than parse transport responses. In a simple feature, direct framework-native
composition may express the same direction without formal ports or dependency
injection.

Coordination is not ownership. For a feature with several independent external
lifecycles, prefer focused capabilities such as coupon application, inventory
availability, payment session, and final submission, each owning its relevant
state, cleanup, race policy, and error contract. A page or composition hook may
combine their current outputs and issue higher-level commands, but it should not
copy their state into a second aggregate store or conceal every effect inside a
single feature controller. Keep genuinely atomic transitions together when
splitting them would create distributed transactions or contradictory truth.

Outside consumers import the feature's public entry, not its internal paths.
Inside the feature, avoid routing every import through the public barrel because
that can hide cycles. Use local direct imports while keeping cross-boundary
imports explicit.

### Stop splitting at the right point

After proposing a structure, verify:

- a maintainer familiar with the stack can locate entry, layout, page, component,
  business rule and data access responsibilities without chat history;
- an ordinary change has one obvious starting location;
- state, effects, domain rules, and external adapters each have an identifiable
  owner;
- the coordinator combines contracts without becoming the owner of every
  lower-level state and lifecycle;
- the public surface is smaller than the implementation surface;
- dependencies do not point from lower-level code back into orchestration;
- tests remain close to the behavior or contract they protect;
- each new directory contains a real concept rather than satisfying symmetry;
- removing a boundary would make ownership or change locality worse.

If the last question has no clear answer, keep the code together for now.

## Classify code by responsibility

Use these questions:

| Code | Preferred home |
| --- | --- |
| Product rule used by one capability | Owning feature/domain |
| UI and state used by one workflow | Owning feature or route |
| Repeated product interaction with stable semantics | Shared feature/capability |
| Business entity representation reused across capabilities | Domain/entity module when it creates a useful boundary |
| Generic UI primitive with no product policy | Shared UI or design system |
| Feature-specific transport mapping or storage schema | Owning feature or page data boundary |
| Product-independent HTTP, dates, storage or logging policy serving broader consumers | Focused shared infrastructure module |
| Multi-feature user journey | Route, page, application service, or higher-level orchestrator |
| One-off helper | Near its caller until real reuse appears |

Shared code is not code used twice. It is code whose meaning and ownership are
genuinely broader than one feature. Name shared modules by capability such as
`date`, `currency`, or `http`, not by vague containers such as `misc`, `common`,
or a single global `utils` file.

## Define module contracts

A useful module boundary states:

- what it owns;
- what it exports;
- which modules it may depend on;
- which parts are internal;
- how errors and asynchronous work cross the boundary;
- whether consumers depend on values, events, interfaces, or concrete objects.

Expose a narrow public API and keep internal file paths private. Avoid barrel
files that blindly re-export everything or introduce hidden cycles. A public
entry point should express an intentional contract.

Prefer dependency flow such as:

```text
app/routes -> product features -> domain/shared capabilities -> platform
```

Lower-level shared modules must not import product features. Peer features
should not reach into each other's internals. Coordinate them from a higher
owner or through an explicit public contract.

When boundary violations are easy and costly, use available lint import rules,
package exports, ownership checks, or build constraints to make the dependency
direction executable. Do not add enforcement tooling when repository scale and
risk do not justify its maintenance cost.

## Review a proposed structure

Look for these signals:

- **Shotgun change:** one ordinary feature requires edits across many global
  technical folders.
- **Dumping ground:** `utils`, `common`, `types`, or `components` has no coherent
  admission rule.
- **False feature:** a tiny reusable control is named as a product feature.
- **Leaky boundary:** consumers import private files because the public API is
  insufficient or inconvenient.
- **Cycle:** two modules own parts of the same policy or coordinate each other
  directly.
- **Premature hierarchy:** folders contain one file and add navigation without
  clarifying ownership.
- **Distributed truth:** the same business rule appears in multiple features or
  shared layers.

Do not reorganize the whole repository because one local area is awkward.
Measure migration success by improved change locality and dependency clarity,
not by conformity to a diagram.

## Influences

- Angular,
  [Organize your project by feature areas](https://angular.dev/style-guide#organize-your-project-by-feature-areas):
  keep related files together and avoid top-level folders based only on code
  type for product applications.
- Kent C. Dodds, [Colocation](https://kentcdodds.com/blog/colocation): place code
  as close as reasonable to what it affects and changes with.
- Feature-Sliced Design,
  [Layers](https://feature-sliced.design/docs/reference/layers) and
  [Slices and segments](https://feature-sliced.design/docs/reference/slices-segments):
  distinguish business slices, technical segments, public APIs, and dependency
  direction. Use it as a reference model, not a mandatory folder template.

- Next.js, [Project structure](https://nextjs.org/docs/app/getting-started/project-structure):
  distinguish routing file conventions from optional colocation strategies.
- Nuxt, [Pages](https://nuxt.com/docs/3.x/directory-structure/pages/) and
  [Layouts](https://nuxt.com/docs/3.x/directory-structure/layouts/): follow the
  selected version's routing and shell conventions rather than transplanting a tree.
