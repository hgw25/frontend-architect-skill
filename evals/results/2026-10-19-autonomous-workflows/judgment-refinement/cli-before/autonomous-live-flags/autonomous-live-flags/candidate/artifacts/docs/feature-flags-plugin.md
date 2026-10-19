# Feature flags plugin design

## Requirement and current facts

`@frontend-architect-eval/feature-flags` is a reusable ESM Vite plugin. An
application configures `featureFlags({ source, expose })`, then imports the
client-safe subset from `virtual:feature-flags`. `source` is a JSON object at a
filesystem path or `file:` URL; `expose` is the explicit list of client-visible
keys. JSON values are supported. A missing requested key and invalid source must
fail with the source path and an actionable reason. In development, editing the
source must update importers.

The existing consumer already uses the public API. The previous text transform
does not implement that API and would make its whole input eligible for client
output, including a server-only token. Vite's resolved configuration and watcher
are the authoritative lifecycle facilities; no separate file watcher is needed.

## Contracts and implementation sequence

1. **Define the public configuration and virtual-module contract** in
   `packages/plugin/src/index.ts` and `src/virtual.d.ts`.
   `featureFlags(options: FeatureFlagsOptions): Plugin` accepts a path or
   `file:` URL and a readonly list of keys. `flags` is a readonly record of JSON
   values. Completion: the workspace consumer typechecks through the package
   export.
2. **Load and select flags at the plugin boundary** in `index.ts`.
   `resolveSourcePath` makes relative paths root-relative after Vite resolves the
   config. `readExposedFlags` parses a JSON object, validates each exposed key,
   and returns only those entries. It owns source/configuration errors and names
   the source/key. Completion: production build includes only exposed values.
3. **Publish a virtual module and support lifecycle changes** in `index.ts`.
   `resolveId`/`load` own the generated module. `buildStart` loads the initial
   state and registers the JSON file as a build dependency. `handleHotUpdate`
   refreshes it and returns the virtual module so Vite reloads its importers.
   Completion: a dev-server source edit reaches the consumer without restarting.
4. **Document and verify the artifact** by linking this document from README and
   running the repository check suite, including its packed-consumer check.

The options are intentionally narrow: runtime values come only from the source
file, and no general transform or arbitrary object option is exposed. A likely
follow-up (different deployments) can supply a different JSON source without
changing the virtual module or consumer imports.

## Technical architecture

```text
Vite config
  │ featureFlags({ source, expose })
  ▼
featureFlags plugin ──configResolved──► resolveSourcePath
  │                                        │
  │ buildStart / handleHotUpdate            ▼
  └──────────────────────────────────► readExposedFlags ──► JSON file
                                           │ selected flags only
                                           ▼
virtual:feature-flags ◄── resolveId/load ─ generated ESM module
  │
  ▼
application importer
```

## Data flow

```text
flags.json change or initial build
  -> readExposedFlags(source path, exposed keys)
  -> JSON parse + object/key validation
  -> selected readonly record
  -> JSON.stringify(record) in virtual module source
  -> Vite module graph / bundled consumer

invalid JSON, non-object root, missing exposed key
  -> contextual plugin error (source and, where applicable, key)
  -> Vite reports the configuration/build error; prior client values are not
     silently substituted

development file edit
  -> handleHotUpdate refreshes selected record
  -> returns virtual module
  -> Vite reloads its importers
```

## Verification and evolution

The project checks build output, development updates, diagnostics, and the
packed package through its public entry point. The initial value is loaded before
module generation, and every reload repeats validation. The generated source is
constructed exclusively from selected entries, so server-only values cannot
enter normal client code or generated-module source maps.

Executed verification: `npm run check` passed after implementation. It covers
plugin build, TypeScript consumer types, production output, development reload,
diagnostics, and installation of the packed artifact.
