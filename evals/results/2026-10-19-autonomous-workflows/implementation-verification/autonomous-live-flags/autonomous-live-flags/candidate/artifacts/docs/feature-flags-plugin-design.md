# Reusable feature-flags plugin design

## Outcome and established facts

The package must let Vite applications import a client-safe snapshot from
`virtual:feature-flags` while the source JSON may also contain server-only values.
The existing consumer contract is `featureFlags({ source, expose })`, where
`source` is a filesystem path or `file:` URL and `expose` is the allowlist. The
package is ESM, targets Vite 8, and already exposes the plugin and a declaration-only
`./virtual` entry point. The current implementation is only a source-text
replacement and does not implement that contract.

Acceptance requires all of the following:

- build output and source maps contain exposed values only;
- missing exposed keys fail with the key and source path in the diagnostic;
- changing the JSON file invalidates the virtual module during development;
- the workspace consumer and a consumer of the packed tarball can use the public
  entry points and declarations;
- malformed options, unreadable or invalid JSON, and a non-object JSON root fail
  without printing source contents or values.

The source file remains authoritative. The plugin owns parsing and projection but
does not cache values across loads; Vite owns module caching, file watching, and
server teardown. Relative string paths are resolved from the process working
directory, matching normal filesystem-path behavior; URL inputs must use `file:`.

## Four dependency-ordered implementation steps

1. **Define and validate the public configuration.** Add exported
   `FeatureFlagsOptions` and JSON value types, normalize the source once, and reject
   invalid `source`/`expose` shapes with corrective diagnostics. Completion check:
   TypeScript accepts the example and focused runtime assertions reject malformed
   configuration.
2. **Generate the safe virtual module.** Implement Vite `resolveId` and `load`
   hooks. `load` registers the source as a watch file, reads and parses it, verifies
   the root object and every allowlisted own key, then serializes only the projected
   object into an ESM export. Completion check: a production build uses the flags,
   while neither its JavaScript nor source maps contain the private token.
3. **Connect development invalidation and diagnostics.** Register a source-file
   watcher during server setup and forward source changes into Vite's
   watcher/HMR pipeline, then implement
   `handleHotUpdate` for the normalized source path, invalidate the internal virtual
   module, and return it to Vite's HMR graph. Reading and parsing failures identify
   the operation and source without embedding source data. Completion check: the
   existing server observes an edit made immediately after its first module load,
   and a missing key rejects a Vite build with key and filename.
4. **Finish the distributable artifact and consumer guidance.** Align ambient
   virtual-module types with all JSON values, retain explicit package exports and
   copied declaration/static files, and document installation and use. Completion
   check: package/type checks pass and a freshly packed, separately installed
   consumer can import the plugin with its Vite peer.

## Code contracts and ownership

- `featureFlags(options: FeatureFlagsOptions): Plugin` is the sole runtime public
  API. It creates one plugin instance for one source/allowlist and exposes no source
  values itself.
- `FeatureFlagsOptions` contains `source: string | URL` and
  `expose: readonly string[]`. Configuration validation happens synchronously so a
  bad integration fails at Vite configuration time.
- Private `resolveSource` owns path/URL normalization. Private `loadFlags` owns the
  asynchronous trust boundary (filesystem and JSON), returning a projected JSON
  object or throwing an actionable `Error`. Neither helper logs or includes values
  in messages.
- `resolveId('virtual:feature-flags')` maps the consumer-visible ID to the private
  `\0virtual:feature-flags` ID. `load(privateId)` returns deterministic ESM for the
  current source and calls `this.addWatchFile`.
- `configureServer` owns one non-persistent source-file watcher and forwards
  debounced changes to the host watcher. `closeBundle` closes
  that resource and clears pending work. `handleHotUpdate` compares normalized paths
  and invalidates the private module in the current Vite module graph. Vite remains
  responsible for module-graph propagation and client reload behavior.
- `virtual.d.ts` owns the ambient consumer contract:
  `flags: Readonly<Record<string, JsonValue>>`, with recursive JSON object/array
  support matching the stated input rather than the former scalar-only type.

No generic provider or transform abstraction is introduced: there is one proven
JSON-file consumer and one Vite lifecycle. A future remote or environment-aware
source can add a separate narrow source adapter without changing projection or the
virtual-module contract; today's private `loadFlags` boundary keeps that change
local.

## Technical architecture

```text
consumer source                         consumer Vite config
import { flags }                        featureFlags(options)
        |                                       |
        | "virtual:feature-flags"               | validated source + allowlist
        v                                       v
+--------------------- Vite plugin instance ----------------------+
| resolveId() -> PRIVATE_ID                                      |
| load() -> addWatchFile() -> loadFlags() -> safe ESM            |
| configureServer() -> source-file watcher -> Vite watcher      |
| handleHotUpdate() -> moduleGraph.invalidateModule()            |
| closeBundle() -> source watcher cleanup                        |
+--------------------------|--------------------------------------+
                           | read only
                           v
                    source JSON file
             (public and server-only values)

Build/dev output receives only the projected ESM object. The filesystem and Vite
module graph are runtime boundaries; package consumers depend only on the root
plugin export and the `./virtual` declaration entry.
```

## Data flow

```text
Vite requests "virtual:feature-flags"
  -> resolveId returns PRIVATE_ID
  -> load registers normalized sourcePath with Vite watcher
  -> readFile(sourcePath)
       ! unreadable -> Error(operation + sourcePath)
  -> JSON.parse(text)
       ! invalid/non-object -> Error(reason + sourcePath; no source contents)
  -> for each expose key, require own property
       ! absent -> Error(key + sourcePath)
  -> project exposed key/value pairs
  -> JSON.stringify(projected object)
  -> return `export const flags = ...`
  -> Vite transforms/bundles module
  -> consumer observes flags

source change
  -> Vite watcher calls handleHotUpdate(file)
  -> matching PRIVATE_ID module is invalidated and returned
  -> next module request repeats the read/project flow
  -> parse/read/key failure is surfaced by Vite; otherwise consumer sees new flags
```

## Verification, compatibility, and recovery

The existing `npm run check` sequence is the release gate: plugin build, workspace
typecheck, production artifact inspection, live development update, failure
diagnostic, and packed-consumer verification. After implementation, build,
typecheck, production isolation, live update, and diagnostics passed. The final
harness step could not write the machine's global npm cache; the package was
therefore packed with an isolated writable cache, its seven expected files were
inspected, and that tarball was installed into a separate temporary consumer and
imported successfully. The focused Node tests also passed for configuration,
secret-free malformed-JSON diagnostics, recursive JSON values, and projection.

The existing caller shape and virtual-module name remain compatible. This is the
first complete implementation at version `0.0.0`, so no legacy string-replacement
behavior is preserved: it was not part of the documented consumer contract. A
failed source edit leaves no plugin-owned mutable cache to repair; correcting the
file triggers the same watch/load path. Publishing is outside this task.
