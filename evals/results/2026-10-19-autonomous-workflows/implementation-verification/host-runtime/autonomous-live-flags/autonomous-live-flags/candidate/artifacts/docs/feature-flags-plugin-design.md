# Feature flags Vite plugin design

## Outcome and current facts

The package must let a Vite application expose an explicit subset of a JSON
feature-flag file through `virtual:feature-flags`. Its existing consumer contract
is `featureFlags({ source, expose })`, where `source` is a filesystem path or file
URL and `expose` is the client allow-list. JSON values are supported. Unlisted
values may be secrets and therefore must not occur in generated JavaScript or
source maps.

The package is ESM and Vite 8 is its host and peer. Vite owns module resolution,
watching, invalidation, build output and source-map assembly. The plugin owns
configuration normalization, reading and validating the source, allow-listing,
and generating the virtual module. The JSON file remains the authority; neither
the plugin nor the browser mutates it.

Acceptance requires production builds, development reloads, useful missing-key
diagnostics, consumer TypeScript declarations, and installation from the packed
artifact. An invalid URL scheme, malformed JSON, a non-object root, or a missing
exposed key is a configuration/source error and fails the requesting Vite load.

## Four dependency-ordered increments

1. **Define the public contract and package surface.** Add typed options and JSON
   value types, retain the named `featureFlags` entry point, declare the virtual
   module from the exported JSON type, and make the package publishable. Complete
   when the plugin and example type-check only through public entry points.
2. **Resolve and validate the source.** Normalize file URLs and filesystem paths
   against Vite's resolved root, read JSON on demand, require an object root, and
   select only own properties named by `expose`. Complete when failures name the
   source and, for missing flags, the key.
3. **Integrate the virtual module lifecycle.** Resolve the public virtual ID to an
   internal ID, register the source with Vite's watcher, generate deterministic
   ESM from only selected data, and invalidate the virtual module when the source
   changes. Complete when build and live development consumers observe the
   expected values and no unexposed token enters JavaScript or maps.
4. **Verify the distributed consumer experience.** Document usage and run the
   build, type, development, diagnostics and packed-install checks. Complete when
   `npm run check` passes from a clean dependency install.

## Code contracts and ownership

- `FeatureFlagValue` is recursive JSON data; `FeatureFlagsOptions` contains
  `source: string | URL` and `expose: readonly string[]`.
- `featureFlags(options): Plugin` constructs one Vite plugin instance. It keeps
  only normalized configuration for that instance; Vite owns hook scheduling.
- `resolveSource(source, root): string` accepts local paths only and resolves a
  relative path against the Vite project root.
- `loadExposedFlags(source, expose): Promise<Record<string, FeatureFlagValue>>`
  owns I/O, JSON/root validation, own-key checks, and allow-list projection. It
  throws actionable errors rather than returning stale/default data.
- `resolveId` and `load` own the virtual-module boundary. `load` registers the
  file dependency before reading it. The generated module contains only the
  projected record, so Vite source maps cannot recover the original JSON.
- `handleHotUpdate` owns source-change invalidation and returns the virtual module
  when present. The next load re-reads authoritative data; there is no plugin
  cache or cross-project state to clean up.

### Technical architecture

```text
Vite config / consumer project
  | featureFlags(options)
  v
featureFlags plugin instance (packages/plugin/src/index.ts)
  |-- configResolved ----------------------> normalized local source path
  |-- resolveId("virtual:feature-flags") ---> internal virtual module ID
  |-- load(internal ID) -------------------> source reader + validator
  |                                             | readFile
  |                                             v
  |                                         flags.json
  |                                             |
  |<----------- generated ESM, exposed keys only
  |-- handleHotUpdate(source) -------------> Vite moduleGraph invalidation
  v
application import { flags } from "virtual:feature-flags"
```

### Data flow

```text
options(source, expose)
  -> configResolved: source path normalized against project root
  -> consumer imports virtual:feature-flags
  -> resolveId: public ID becomes internal ID
  -> load: addWatchFile(source)
  -> read UTF-8 -> JSON.parse -> require object root
       | parse/root failure -> throw diagnostic with source
  -> for each expose key: require own property
       | missing -> throw diagnostic with key + source
  -> projected record -> JSON serialization + safe JSON.parse literal -> generated ESM
  -> Vite transforms/bundles -> consumer receives flags

source change -> Vite watcher -> handleHotUpdate
  -> invalidate internal module -> next import/load repeats the authoritative flow
  -> new projected record reaches the consumer
```

## Verification, compatibility, and evolution

The existing API and virtual import stay source-compatible. Runtime output is a
read-only-by-contract record and errors are terminal so a bad rollout cannot
silently use stale or empty flags. Checks cover workspace build/type use, secret
absence in build artifacts, watch-mode updates, missing-key diagnostics, and a
fresh consumer installing the tarball.

A realistic next change is supporting a second source format. The source-reading
and projection boundary allows a format-specific reader without changing virtual
module resolution or the consumer API; it should be added only with a concrete
format contract. Supporting remote URLs would additionally require freshness,
cancellation and credential policy, so non-file URLs remain rejected today.

## Implementation evidence

Implemented on 2026-10-19. `npm run check` passed: package build, workspace and
consumer type checks, production consumer build with secret-absence assertion,
development source watching/reload, missing-key diagnostics, and packed-artifact
installation all completed successfully. `npm test --workspace
@frontend-architect-eval/feature-flags` also passed three focused contract tests
covering unusual JSON property names (`__proto__`), client allow-listing, relative
source resolution, watch registration, and rejection of remote URLs.
