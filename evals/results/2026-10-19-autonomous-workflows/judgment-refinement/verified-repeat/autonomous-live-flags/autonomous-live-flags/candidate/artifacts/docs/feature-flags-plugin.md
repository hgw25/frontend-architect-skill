# Feature flags plugin design

## Goal and existing contracts

`@frontend-architect-eval/feature-flags` is a Vite plugin for applications that
need to import the client-safe portion of a JSON feature-flag file from
`virtual:feature-flags`. Its established configuration is
`featureFlags({ source, expose })`, where `source` is a filesystem path or file
URL and `expose` is the complete client allow-list. A source file can also hold
server-only values, so neither those values nor the original JSON may be emitted
to JavaScript or source maps.

The plugin supports Vite 8 and ESM consumers. It deliberately treats source
contents as JSON values: primitives, arrays and objects are serializable, while
only explicitly exposed top-level names are supplied to the virtual module.
Configuration and JSON errors are consumer errors and must identify the failing
option or source path. In development, changing the source file must invalidate
the virtual module and let Vite serve its new contents. Production builds use the
same generated virtual-module code.

## Delivery sequence

1. **Define the public contract and normalize configuration** — change
   `src/index.ts` to expose typed options and a `featureFlags` Vite plugin;
   normalize `source` with Node's URL/path utilities and validate the explicit
   allow-list. Check: TypeScript accepts the workspace consumer and rejects
   malformed plugin options.
2. **Load and select safe JSON** — keep file reading, JSON parsing, root-object
   validation, missing-key diagnostics and serialization in the plugin-owned
   loader. The loader returns generated ESM containing only selected keys.
   Check: a production build renders `checkoutV2` and `theme`, while no
   `SERVER_TOKEN` or its value occurs in generated assets or maps.
3. **Integrate with Vite lifecycle** — implement the resolved virtual ID,
   `resolveId`, `load`, `configureServer`, and `handleHotUpdate` hooks. The
   server watches the normalized source, invalidates the virtual-module graph
   entry after a matching change, and returns it to Vite's HMR pipeline. Check:
   the development integration observes a JSON edit without restarting Vite.
4. **Publish the artifact and document use** — retain the existing ESM exports
   and virtual-module declarations, update package metadata and README usage.
   Check: the workspace build and separately installed packed package succeed.

## Code contracts and ownership

`featureFlags(options: FeatureFlagsOptions): Plugin` is the sole public runtime
API in `src/index.ts`. `FeatureFlagsOptions` has `source: string | URL` and
`expose: readonly string[]`; it is intentionally small so future source formats
or remote delivery require an explicit new adapter rather than a loosely typed
option bag.

`normalizeOptions` owns configuration validation and returns the absolute
`sourcePath` plus a duplicate-free exposed-key list. `readFlagsModule` owns
filesystem I/O, JSON parsing, root-object and requested-key validation, selected
data construction and `export const flags = ...` serialization. It never returns
the source object, which prevents accidental leakage through later hooks.

The Vite plugin owns virtual-ID resolution and Vite lifecycle coordination. Its
`load` hook invokes `readFlagsModule`; its development hooks own watcher
registration and module-graph invalidation. Vite owns socket transport and
browser module replacement. No plugin state is shared between plugin instances.

## Technical architecture

```text
vite.config.ts
  │ featureFlags({ source, expose })
  ▼
featureFlags / normalizeOptions  ──────► absolute sourcePath + expose keys
  │                                      │
  │ resolveId("virtual:feature-flags")   │ watchFile(sourcePath) in dev
  ▼                                      ▼
resolved virtual ID                 Vite watcher / module graph
  │                                      │ JSON change → invalidate virtual module
  ▼                                      ▼
load(resolved virtual ID) ──► readFlagsModule ──► Vite HMR pipeline
                                 │
                                 ▼
                           source JSON file
```

## Data flow and failures

```text
JSON file
  │ readFile(sourcePath, utf8)
  ▼
JSON.parse ──parse failure──► Error("Could not parse feature flags …")
  │
  ▼
plain top-level object ──invalid──► Error("must contain a JSON object …")
  │
  ▼
select each `expose` key ──missing──► Error("missing exposed key …")
  │
  ▼
selected object only ──JSON.stringify──► virtual module source
  │                                         │
  └──── file change (dev) ───────────────────┴─► invalidate → reload → browser
```

## Verification and evolution

Executed `npm run check`: the package built, the real workspace consumer type
checked, Vite production and development integrations passed, configuration and
source diagnostics passed, and a separately installed packed package passed.
The production check confirms the allow-listed application output without the
server-only source value. The follow-up change most likely to occur is adding a
new client flag: it only requires updating `flags.json` and `expose`; the loader
and its secrecy invariant do not change. A different source type is intentionally
outside this contract and should be introduced as a separately typed adapter.
