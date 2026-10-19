# Feature flags Vite plugin design

## Outcome and boundaries

`@frontend-architect-eval/feature-flags` is an ESM Vite plugin for applications
that keep feature flags in a local JSON file. Consumers configure a source file
and an explicit allowlist, then import the filtered values from
`virtual:feature-flags`.

The JSON file is build-time input owned by the consuming project. The plugin owns
reading and validating it, selecting public keys, generating the virtual module,
and registering the file with Vite's watcher. Only selected values may enter
client code or source maps. This package does not provide remote flag delivery,
runtime mutation, or authorization; client-visible flags must never be treated as
secrets or server-side access controls.

Supported public contracts:

- `featureFlags(options: FeatureFlagsOptions): Plugin`
- `FeatureFlagsOptions.source: string | URL`, where relative paths resolve from
  Vite's configured root and URLs must use the `file:` protocol
- `FeatureFlagsOptions.expose: readonly string[]`, the keys permitted in clients
- `virtual:feature-flags`, exporting an immutable TypeScript view named `flags`;
  values may be any JSON value

Invalid options, unreadable or invalid JSON, a non-object JSON root, and missing
allowlisted keys are configuration errors. Diagnostics identify the option or key
and the source path. Duplicate exposed names are harmless but rejected because
they usually indicate a consumer configuration mistake.

## Implementation sequence

There are four dependency-ordered increments:

1. Define the public option and JSON-value types and implement source/allowlist
   validation in `packages/plugin/src/index.ts`. Completion: package typecheck
   accepts the example configuration and rejects no supported path/URL form.
2. Implement Vite virtual-module resolution and loading. Loading reads the source,
   validates its object shape and selected keys, emits only selected data, and
   calls `addWatchFile`. Completion: production build includes exposed keys but no
   unexposed secret, and invalid keys produce source-aware diagnostics.
3. Complete consumer artifacts and documentation in `virtual.d.ts`, package
   metadata, and `README.md`. Completion: the workspace and an installed tarball
   resolve runtime exports and virtual-module declarations.
4. Verify build, development invalidation, diagnostics, and packed consumption
   through the repository's `npm run check`; reconcile this document with the
   implemented symbols and evidence.

## Code contracts and ownership

`featureFlags` validates stable option structure synchronously and returns one
Vite plugin instance. The instance stores the resolved source path after
`configResolved`. `configureServer` registers the path with Vite and starts a
narrow native watcher for the same file. Native events are briefly deferred: an
equivalent Vite event cancels the fallback, otherwise the plugin forwards one
change into Vite's watcher. This avoids duplicate invalidation on working host
watchers while covering environments where a dynamically registered file is
listed but emits no host event. `load` registers the file as the virtual module's
dependency so the resulting Vite change invalidates the correct module.
`closeBundle` releases the native watcher and pending timer. With watching
explicitly disabled, server setup does not create either watcher or promise live
updates. Vite still owns module caching, invalidation, HMR, and server teardown.

`loadFlags(sourcePath, expose)` is the effect boundary: it reads one file, parses
JSON, checks the root and key presence, and returns a newly allocated record that
contains only allowlisted keys. It never returns or serializes the source object.
File, parse, shape, and missing-key failures propagate as actionable plugin
errors; there is no stale/default fallback.

The `load` hook registers the source as a watched dependency before reading it,
then serializes the already-filtered record into ESM. It returns generated code
without source content from the JSON input, keeping private values out of source
maps. `resolveId` exposes only the documented virtual ID; implementation IDs stay
private.

## Technical architecture

```text
Consumer vite.config.ts
  | featureFlags({ source, expose })
  v
Public package entry: packages/plugin/src/index.ts
  |-- configResolved(config) --> resolve source against Vite root
  |-- configureServer(server) --> Vite watcher + narrow native fallback
  |-- resolveId("virtual:feature-flags") --> private virtual ID
  `-- load(private virtual ID)
        |-- addWatchFile(source path) --> Vite watcher/cache lifecycle
        |-- loadFlags(path, expose) --> Node filesystem + JSON parser
        `-- generated ESM (filtered values only) --> Vite module graph
                                                    |
Consumer source <---- import { flags } from "virtual:feature-flags"
  ^
  `---- types supplied by package subpath export "./virtual"
```

## Data flow

```text
flags.json change / initial module request
  -> Vite requests private virtual module
  -> load hook registers flags.json as a watched file
  -> read UTF-8 text
     -> read failure -----------------------> diagnostic with source path
  -> JSON.parse
     -> parse/non-object failure -----------> diagnostic with source path
  -> for each expose key, own-property lookup
     -> missing key ------------------------> diagnostic with key + source path
  -> copy selected JSON values into a fresh null-prototype record
  -> JSON.stringify(filtered record only)
  -> generated `export const flags = JSON.parse(...)`
  -> Vite build output or dev module cache
  -> consumer observes new immutable typed value

On a development file change, either Vite's watcher event wins or the deduplicated
native fallback forwards it. Vite's watched-file dependency then invalidates the
virtual module; the next request repeats the read/filter/generate path. No plugin
cache can publish stale flags.
```

## Verification, compatibility, and evolution

The existing `featureFlags({ source, expose })` consumer API and virtual module
name remain unchanged. Public package exports keep internals inaccessible. The
decisive checks are workspace typechecking, a sourcemapped production build,
development source-change observation, failure diagnostics, and importing the
packed tarball in a separate project.

A realistic next change is supporting another serializable flag value such as an
array or nested targeting metadata. The recursive `JsonValue` contract and
selection boundary already support that without changing plugin lifecycle or
exposing the rest of the source. A future remote source would have different
freshness, error, credential, and cancellation semantics and should be a separate
source adapter rather than another loosely related option on this file plugin.

Verification status: plugin build, workspace typecheck, sourcemapped production
build/privacy assertion, development change propagation, and failure diagnostics
pass. The packed-consumer check reached `npm pack` only when using a writable
temporary cache; its subsequent clean `npm install` could not complete without
network access. A separate local tarball inspection/import check remains the
available packaged-artifact evidence in this environment.
