# Module Boundaries

Use this reference when deciding between feature/domain grouping and technical
role grouping, defining public module APIs, reorganizing a frontend codebase, or
reviewing dependency direction.

Use [runtime-and-delivery.md](runtime-and-delivery.md) instead when the dominant
decision is workspace packaging, build graphs, or server/client placement.

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

For a non-trivial product application, prefer feature/domain boundaries at the
upper level and technical roles only inside a boundary when the module is large
enough to benefit from them.

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
| HTTP, dates, storage, logging, or environment integration | Focused shared infrastructure module |
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
