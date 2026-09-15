# Frontend Infrastructure

Use this reference when building or reviewing component primitives, design
systems, SDKs, shared state or data libraries, build plugins, lint rules,
codemods, generators, workspace packages, or other foundations consumed by
multiple frontend features, applications, or teams.

This guidance extends the shared architecture, module, state, interface, and
verification standards. It is not an alternative mode that replaces them.

## Require a real infrastructure boundary

Infrastructure is justified when at least one current condition exists:

- several consumers need the same stable behavior or policy;
- inconsistent local implementations create correctness, accessibility,
  security, performance, or maintenance risk;
- a platform or third-party integration needs one owned adapter;
- independent packages, applications, or teams require an explicit contract;
- repeated manual work can be replaced by deterministic tooling.

A second caller alone is not proof. Compare semantics, lifecycle, compatibility,
and reasons for change. Record the consumers and non-goals before designing the
public surface.

## Design the contract before the internals

For a maintained foundation, define:

- primary consumers and supported use cases;
- runtime, framework, browser, TypeScript, and package-manager support;
- public entry points and what remains internal;
- data ownership, mutation, lifecycle, cleanup, and concurrency semantics;
- errors, warnings, diagnostics, and recovery behavior;
- extension points and the limits of customization;
- performance and bundle expectations;
- compatibility, deprecation, migration, and release policy.

Prefer a small orthogonal core that composes into advanced behavior. Avoid a
single universal API built from boolean switches, loosely typed option bags, or
callbacks for every imagined future need. An escape hatch should preserve the
core invariants and exist for a demonstrated integration need.

## Build package boundaries deliberately

- Use package exports to distinguish public entry points from internals.
- Keep types aligned with runtime exports and validate them from a consumer
  project, not only inside the package source.
- Choose ESM, CommonJS, browser, server, and declaration outputs from actual
  consumer requirements. Do not publish every format by reflex.
- Declare peer dependencies when the consumer must supply a singleton or
  compatible host, and test the supported version range.
- Preserve tree shaking and side-effect metadata where relevant; verify the
  published artifact rather than trusting source structure.
- Prevent cycles and forbidden imports with repository tooling when package
  scale justifies it.
- Test packed or built output so missing files, incorrect exports, and invalid
  declarations fail before release.

SemVer is a communication contract, not a substitute for judgment. A type-only
change, CSS token change, focus behavior change, or stricter validation can be
breaking even when runtime function names stay the same.

## Build component and design-system foundations

For reusable UI primitives, accessibility and interaction are public behavior:

- semantic roles, names, states, keyboard model, focus entry and restoration;
- controlled and uncontrolled ownership when both are genuinely required;
- ref forwarding, DOM event composition, portals, layering, and form behavior;
- server rendering, hydration, stable IDs, and browser-only access;
- directionality, localization, zoom, forced colors, and reduced motion where
  relevant;
- theming and tokens without leaking product-specific policy into primitives.

Prefer headless behavior primitives when products need independent styling.
Prefer styled components when the visual policy itself is the shared contract.
Composition and slots should not make semantics or focus ownership ambiguous.

Verify interaction through keyboard and assistive-technology behavior, not only
snapshots. Use stories or examples to exercise meaningful variants and visual
regressions, but keep assertions for behavior that must never drift.

## Build state, data, and SDK foundations

- Separate transport, cache, domain policy, and framework binding when they have
  different consumers or lifecycles.
- Define identity, deduplication, freshness, invalidation, cancellation,
  optimistic reconciliation, and subscription cleanup.
- Keep a framework-neutral core only when non-framework consumers actually
  exist; otherwise framework-native code may be the clearer contract.
- Validate untrusted responses at runtime and expose stable domain errors rather
  than leaking arbitrary transport failures.
- Make SSR, concurrent rendering, multiple instances, and teardown behavior
  explicit when supported.
- Provide diagnostics that identify the consumer action and corrective step
  without exposing credentials or personal data.

## Build tools, plugins, lint rules, and generators

Tooling runs inside another system and must respect its lifecycle and contracts.

- Understand host phases, ordering, concurrency, caching, watch mode, HMR, and
  cleanup before implementing hooks.
- Keep transforms deterministic for the same declared inputs. Include all
  behavior-affecting inputs in cache identity.
- Validate configuration early with actionable file, option, and remediation
  context. Distinguish user configuration errors from internal failures.
- Preserve source maps and source identity for code transforms, but build them
  only from client-safe transformed inputs. Never let unfiltered server
  configuration, credentials, or private source data re-enter a client artifact
  through `sourcesContent` or another debugging channel.
- Handle paths, URLs, case sensitivity, separators, and symlinks according to
  supported environments rather than the author's machine.
- Prefer established host filtering, resolver, AST, and diagnostic utilities
  over ad hoc parsing or string replacement.
- Make generators repeatable and explicit about overwrite behavior. Generated
  output should pass the project's own checks.
- Test plugins in a minimal real host project for development and production
  build behavior; unit-test pure transforms separately.

## Verify the public artifact

Infrastructure validation should cover the highest-risk contracts:

1. focused unit or property tests for pure logic and invariants;
2. type-level consumer tests for inference and invalid calls;
3. integration tests through the public entry point;
4. browser, framework, build, or package-manager matrix only for versions the
   project claims to support;
5. accessibility and interaction checks for UI foundations;
6. bundle, startup, transform, or runtime benchmarks when performance is part of
   the contract;
7. packed-artifact or example-app verification before release.

Test failure diagnostics as well as success. A tool that detects an error but
cannot tell a consumer how to fix it has an incomplete developer experience.

## Evolve without trapping consumers

- Add capabilities through composition or narrow options before widening the
  core abstraction.
- Deprecate with a replacement, warning scope, migration example, and removal
  horizon when compatibility matters.
- Provide a codemod only when the migration is mechanical enough to be safer
  than documentation; make it idempotent and test representative syntax.
- Keep changelogs centered on consumer impact, not internal commits.
- Use canary or prerelease versions for high-risk contract changes when the
  repository release process supports them.
- Preserve rollback by avoiding irreversible consumer migration in the same
  step as an unproven foundation rewrite.

## Lessons from infrastructure codebases

Use these as design evidence, not templates:

- [Vite](https://github.com/vitejs/vite) extends an established plugin contract,
  uses host utilities for filters, and verifies plugins through real development
  and build playgrounds in addition to unit tests.
- [Radix Primitives](https://github.com/radix-ui/primitives) treats accessibility,
  customization, behavior composition, and consumer experience as core primitive
  contracts rather than application-level cleanup.
- [Storybook](https://github.com/storybookjs/storybook) separates manager and
  preview execution, exposes purpose-specific public APIs, and evolves a large
  addon ecosystem with compatibility concerns.
- [TanStack Query](https://github.com/TanStack/query) separates framework-neutral
  query behavior from framework adapters and tests observable async semantics.

The transferable standard is not repository size. It is that public foundations
are judged by consumer contracts, failure behavior, compatibility, and verified
artifacts—not by how abstract their internal code appears.
