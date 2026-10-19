# Feature flags Vite plugin design

## Goal and existing contract

`@frontend-architect-eval/feature-flags` is a Vite plugin used by applications
that import `flags` from `virtual:feature-flags`.  The plugin receives a JSON
file and an explicit allow-list.  Only listed keys may be emitted to client
code; the source file can also contain server-only values.  A missing allowed
key is a configuration error which identifies both the key and source file.

The existing workspace consumer is the primary consumer.  The package also has
to work from its built, installed artifact.  The supported inputs are an
absolute or relative filesystem path and a `file:` URL.  Other URL schemes are
not a filesystem source and are rejected rather than fetched.  Flag values are
JSON values, so the public type represents JSON rather than a narrower runtime
subset.

## Delivery sequence

1. Define the public options and JSON-value types and normalise `source` to one
   resolved filesystem path.  Check options, parse the JSON object, and project
   only `expose` keys.  Completion: bad source, malformed JSON, non-object
   input, and missing exposed key report actionable diagnostics.
2. Replace text transformation with a Vite virtual module that exports the
   projected data.  Completion: production build imports `virtual:feature-flags`
   and its emitted code (including source maps) contains no non-exposed value.
3. Register the source file with Vite's watcher, reload the projection on file
   changes, invalidate the virtual module, and trigger a browser reload.
   Completion: a development edit reaches importers without restarting Vite.
4. Build, type-check, build the example, exercise development and diagnostics,
   and verify the packed package flow using repository checks.

## Contracts and ownership

`featureFlags(options: FeatureFlagsOptions): Plugin` owns source-path
normalisation, file parsing, allow-list enforcement, the virtual module, and
watch lifecycle. `FeatureFlagValue` and `FeatureFlagsOptions` are public
declarations exported from the package root.  Vite owns module resolution,
watching events, module invalidation, and browser transport.

Every virtual-module load and watched change reads the configured file; there is
no client-side fetch or server configuration object exposed to the bundle. A
failed watched update is surfaced through Vite's logger and leaves Vite's
previous module graph entry intact, allowing the developer to correct a partial
file save.

## Technical architecture

```text
Vite config
  -> featureFlags({ source, expose })
  -> feature-flags plugin
       -> source normaliser -> filesystem path
       -> JSON reader + allow-list projector
       -> virtual:feature-flags resolver/loader
  -> application importer -> browser bundle

Vite dev server
  -> watcher change(source path)
  -> plugin reloads projection -> invalidates virtual module
  -> Vite websocket full reload -> application importer
```

## Data flow and failure paths

```text
flags.json (full JSON object)
  -> readFlags(source path)
  -> validate object / every exposed key
  -> pick(expose) [server-only keys removed]
  -> JSON.stringify(projected flags)
  -> virtual module `export const flags = ...`
  -> consumer import -> visible application state

malformed JSON, non-object, missing exposed key
  -> FeatureFlagsConfigurationError (source + corrective context)
  -> Vite build/load diagnostic; no client module is emitted

dev file change
  -> reread and re-project
  -> success: invalidate + full reload
  -> failure: Vite error log; retain last valid virtual-module value
```

## Evolution and verification

Adding an additional client flag only requires adding it to `expose`; no plugin
API expansion is needed. If a future consumer needs typed flag names, it can
layer generated declarations on this stable runtime contract without changing
how data is filtered. The package exposes only root runtime/types and the
existing declaration-only `./virtual` path; implementation modules remain
private.

Executed checks are recorded in the delivery response after the final code is
verified.
