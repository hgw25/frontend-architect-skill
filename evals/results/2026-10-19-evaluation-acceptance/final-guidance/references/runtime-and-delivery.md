# Runtime and Delivery Boundaries

Use this reference when frontend code may run during build, on a server or edge
runtime, in a browser, or in a worker; when choosing rendering, routing, cache,
package, and bundle boundaries; or when planning observability and rollout.

Use [rendering-and-performance.md](rendering-and-performance.md) instead when
the dominant concern is the target platform's update-to-display, thread, layout,
paint, rasterization, frame, list, image, or memory cost.

## Map environments before components

Identify which code and data belongs to each relevant environment:

- build or prerender environment;
- request-time server or edge runtime;
- browser main thread or worker;
- external API, CDN, storage, analytics, or embedded third party.

Choose placement using capability, trust, latency, interactivity, cacheability,
and bundle cost. Code that needs secrets, privileged data access, or authoritative
authorization belongs behind a server boundary. Code that needs direct user
interaction or browser APIs belongs in the browser. Keep the client boundary as
narrow as practical, but do not add a server round trip for cheap local behavior.

Anything crossing an environment boundary needs an explicit serializable
contract. Do not pass server-only objects, credentials, database records with
unselected fields, or framework-internal state into browser code.

## Choose rendering and data placement

Static generation, request-time rendering, streaming, client rendering, and
progressive enhancement solve different freshness and interaction needs.

Ask:

- Is the content shared or user-specific, and how fresh must it be?
- Is it needed for the first meaningful response, metadata, or indexing?
- Does it require browser state or immediate interaction?
- Can independent data work start in parallel?
- What should the user see while a boundary is pending or fails?
- Can hydration reproduce the server output without browser-only assumptions?

Avoid client fetch-after-render waterfalls for data already available to the
server. Avoid moving an entire tree into the client because one leaf is
interactive. Place loading and error boundaries around meaningful user outcomes,
not around every asynchronous function.

When the product claims or can practically preserve a server-rendered,
non-streamed, or non-hydrated baseline, keep that supported path correct. Do not
infer that every JavaScript-dependent editor, canvas, or third-party SDK must be
fully usable without JavaScript. Treat hydration mismatch, late navigation,
duplicate submission, and partial streaming failure as runtime states when the
selected framework can encounter them.

## Give every cache an owner

Before caching data, define:

- resource identity and cache key;
- scope: public, tenant, user, session, or request;
- freshness and acceptable staleness;
- invalidation trigger and the mutation that owns it;
- behavior on error, retry, offline use, and concurrent mutation;
- whether server and client caches represent the same fact.

Never place authorization-dependent or user-specific data in a shared public
cache key. Do not treat cache invalidation as an afterthought to a mutation.
Optimistic UI is a temporary projection: reconcile it with the authoritative
result and define rollback or recovery when the mutation fails.

Prefer the selected framework's data and cache model when it matches the
lifecycle. A second client cache, component copy, or global store must own a
different concern rather than mirror the same server truth indefinitely.

## Control bundles and dependency boundaries

- Keep server-only dependencies and secrets out of browser module graphs.
- Split code at routes, capabilities, or expensive optional interactions when
  doing so improves a real user path; excessive chunks and loading boundaries
  also have costs.
- Inspect dependency weight, runtime side effects, browser support, maintenance,
  and security before adding a package.
- Measure shipped JavaScript and field performance for material changes rather
  than assuming a framework feature makes them fast.

A workspace package is an operational boundary, not a prestigious folder. Add
one when independent consumers, ownership, builds, versioning, or an enforced
public contract justify it. Otherwise keep the module near its owner.

When dependency direction matters, enforce it with available import rules,
package exports, ownership rules, or build graph constraints. Documentation
alone is insufficient when violations are easy and costly.

## Set delivery budgets where they can be enforced

For material delivery work, connect representative field metrics to route or
capability budgets for shipped code, critical resources, and request waterfalls.
Give each threshold a baseline, owner, enforcement point, tolerance, and
regression decision. Keep controlled lab diagnostics distinct from field
evidence, and do not block releases on a noisy single run.

## Make changes releasable and operable

For a risky or cross-cutting change, decide:

- whether the contract can migrate compatibly and incrementally;
- whether a feature flag, staged rollout, or kill switch reduces meaningful risk;
- what can be rolled back independently;
- which failures need a local error boundary or recovery path;
- which production signals would reveal user harm;
- how logs, errors, traces, analytics, and source maps avoid secrets and personal
  data;
- which field metrics and representative segments matter.

Telemetry should answer a decision or detect a failure. Do not add events merely
because an interaction exists. Use stable event semantics, sampling where
appropriate, and project privacy rules. Lab profiling diagnoses controlled
conditions; field data shows what real users experienced.

Keep implementation increments reviewable and reversible. Do not enforce a
universal line or file limit, but separate preparatory refactoring, contract
changes, and feature behavior when independent review or rollback would be
materially safer.

## Lessons from production codebases

Use these projects as evidence and counterexamples, not templates:

- [Vercel Commerce](https://github.com/vercel/commerce) keeps most product data
  work on the server, limits client modules to interactive leaves, couples cart
  mutations with cache updates, and models optimistic cart state separately from
  authoritative persistence.
- [Bulletproof React](https://github.com/alan2207/bulletproof-react) demonstrates
  feature colocation and enforceable one-way imports. Its exact folders and
  libraries are optional; the transferable idea is turning costly dependency
  rules into tooling.
- [Cal.com](https://github.com/calcom/cal.com) shows that a large monorepo needs
  package-specific contracts, explicit local instructions, targeted validation,
  and small reviewable changes. Its package count is a result of product scale,
  not a starting template.

## Primary references

- React, [Server Components](https://react.dev/reference/rsc/server-components):
  server and client execution create a network and serialization boundary.
- Next.js,
  [Server and Client Components](https://nextjs.org/learn/react-foundations/server-and-client-components):
  place the client boundary around interactivity rather than the entire tree.
- web.dev,
  [Core Web Vitals workflows](https://web.dev/articles/vitals-tools): combine
  field evidence with lab diagnostics.
- web.dev, [Web Vitals](https://web.dev/articles/vitals): current stable Core Web
  Vitals and the distinction between field measurement and lab diagnostics.
- OpenTelemetry,
  [JavaScript](https://opentelemetry.io/docs/languages/js/): telemetry capability
  and browser maturity are version-sensitive; verify current support before
  choosing instrumentation.
