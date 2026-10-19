# Feature flags plugin technical design

## Outcome and established contracts

This package lets Vite applications expose an explicit subset of a JSON feature
flag file through `virtual:feature-flags`. The existing consumer API remains:

```ts
featureFlags({ source: string | URL, expose: readonly string[] })
```

`source` is a filesystem path or `file:` URL. The file must contain a JSON object;
each exposed property may contain any JSON value. `expose` is the only client data
allowlist: unlisted properties must not enter generated JavaScript, source maps, or
diagnostics. A missing exposed property is a configuration error that identifies
both the property and source. Vite owns module loading and file watching; the
plugin owns source normalization, parsing, projection, virtual-module generation,
and invalidation of that module when the file changes.

The package supports its declared Vite 8 peer range, ESM consumers, and TypeScript
consumers. Its public entries are the plugin at the package root and ambient virtual
module declarations at `./virtual`; build internals remain private.

## Functional sequence

Implementation has three dependency-ordered steps:

1. **Define and generate the client-safe module.** `featureFlags(options)` validates
   stable configuration and supplies Vite `resolveId`/`load` hooks. `load` registers
   the normalized source with Vite, reads and validates the current JSON object,
   projects only own properties named by `expose`, and returns deterministic ESM.
   Completion check: production build contains exposed names/values while neither
   JavaScript nor source maps contain the private token; invalid/missing data gives
   an actionable error.
2. **Refresh the module in development.** The hot-update hook recognizes the
   normalized source path, invalidates the resolved virtual module, and returns it
   to Vite's update pipeline. The next load reads the file again; the plugin keeps
   no competing flag cache. Completion check: a running Vite server watches the
   file and a subsequent SSR import observes changed public values only.
3. **Complete the distributable contract.** Public option/value declarations,
   package exports, copied ambient declarations, documentation, and the example
   stay aligned with the runtime implementation. Completion check: type checking,
   packing, installation into an isolated consumer, and import through the public
   entry all succeed.

## Supporting code contracts

- `FeatureFlagsOptions` (`packages/plugin/src/index.ts`) is the public immutable
  input contract. Configuration validation happens synchronously in
  `featureFlags`, before Vite runs a build.
- `featureFlags(options): Plugin` is the sole runtime public API. Each plugin
  instance owns one normalized source and one virtual-module identity, so multiple
  instances do not share mutable state.
- The private source loader reads on every Vite `load`, parses JSON, requires a
  non-array object, and constructs a new client-safe record from allowlisted own
  properties. Read, parse, shape, and missing-key failures preserve their cause
  while adding source/key context; no source contents are included.
- `virtual:feature-flags` exports a deeply JSON-compatible `FeatureFlagValue` type
  and `Readonly<Record<string, FeatureFlagValue>>`. The declaration describes the
  stable generic module; individual project keys remain runtime configuration.
- Vite's watcher is the resource owner. The plugin registers `source` with
  `addWatchFile` and performs no independent watcher setup or cleanup.

## Technical architecture

```text
Vite config (consumer)
  | featureFlags({ source, expose })
  v
Plugin instance: normalized path + allowlist
  | resolveId("virtual:feature-flags")
  v
Private resolved virtual id
  | load() -------- addWatchFile(path) --------> Vite watcher
  |                  |
  |                  +--> read/parse/project --> filesystem JSON
  v
Client-safe ESM only
  |
  +--> consumer module graph / production bundle

Package exports
  +--> "." runtime + plugin declarations
  +--> "./virtual" ambient declarations + empty runtime marker
```

## Data flow

```text
Initial/build load:
import request -> resolveId -> load -> read source bytes -> JSON.parse
  -> [invalid JSON/root] contextual Vite error -> build/dev requester
  -> project each exposed key
       -> [missing own key] contextual Vite error -> build/dev requester
       -> serialize projected record -> ESM JSON.parse -> consumer flags export

Development change:
filesystem event -> Vite watcher -> plugin hot-update match
  -> locate + invalidate virtual module
  -> Vite invalidates importers -> next module load -> current source flow above
  -> updated flags returned to consumer
```

## Verification, compatibility, and evolution

The repository's `npm run check` is decisive for compiled output, both TypeScript
consumers, production secrecy (including source maps), live development refresh,
missing-key diagnostics, and a separately installed packed consumer. The focused
`node --test packages/plugin/test/plugin.test.mjs` suite covers configuration,
all JSON value shapes, special JSON property names, private-value exclusion, and
malformed roots. Both commands passed on 2026-10-19 after the final implementation.

This is a compatible completion of the documented API, not a migration. A realistic
follow-up is supporting another source format: it can be added behind a narrow
source-reader option while retaining projection and virtual-module lifecycle
unchanged. Supporting per-flag generated TypeScript keys would require a separate
generated declaration workflow and is deliberately outside this package contract.
