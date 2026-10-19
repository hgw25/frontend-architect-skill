# Feature-flags Vite plugin design

## Requirement and facts

The package is a reusable ESM Vite plugin. A consuming application configures
`featureFlags({ source, expose })` and imports `flags` from
`virtual:feature-flags`. `source` is a JSON object on the local filesystem,
while `expose` is the explicit client allow-list. JSON values are supported. A
missing allow-listed key is a configuration error that names both the key and
source. Values outside the allow-list, including secrets, must not be emitted in
the JavaScript bundle or its source map. In development a source-file change must
refresh importing modules.

The inspected consumer already uses a file URL and imports the virtual module.
The package already publishes ESM, its main type declarations, and an ambient
declaration entry point for `virtual:feature-flags`.

## Implementation sequence

1. Define the public option and JSON-value types, normalize supported filesystem
   paths/file URLs, and validate configuration at Vite startup. The check is a
   build through the consumer config with an invalid source or missing exposed
   key.
2. Add a Vite virtual-module owner that reads and projects only allow-listed
   values, then serializes that projection as the module source. The build check
   confirms the consumer output contains its exposed values and neither the
   unexposed token nor full source JSON appears in source maps.
3. Register the source file with the dev server watcher and invalidate the
   virtual module on a change so its importers are reloaded. The dev check edits
   the source file and observes the updated consumer result.
4. Keep the declaration package entry aligned with the emitted JSON-value shape,
   document usage and run the workspace's full package/build/dev/diagnostic
   checks. A packed-consumer check proves the public artifact rather than source
   layout.

## Contracts and ownership

`featureFlags(options: FeatureFlagsOptions): Plugin` is the only runtime public
API. `FeatureFlagsOptions.source` accepts a filesystem path or `file:` URL;
`expose` is a readonly list of names. `FeatureFlagValue` models JSON values and
`FeatureFlags` is a readonly object of those values. The plugin owns path
normalization, parsing, allow-list projection and invalidation. Vite owns module
graph propagation and browser transport.

The internal `readExposedFlags` operation reads the configured file and verifies
that its root is an object and every requested name is present. It returns a new
object containing only exposed values. It never returns the parsed source object,
which keeps the secret boundary local and makes both generated code and source
maps safe. Parser/read failures include the resolved source path and retain the
underlying cause.

The virtual ID is internal (`\0virtual:feature-flags`); consumers only see the
stable `virtual:feature-flags` contract. No framework-neutral runtime is added:
the demonstrated consumers are Vite applications and Vite already owns module
lifecycle and HMR.

## Technical architecture

```text
consumer vite.config.ts
  -> featureFlags(options) [public factory]
  -> Vite hooks [plugin lifecycle]
       -> normalizeSourcePath / readExposedFlags [plugin-owned validation]
       -> virtual:feature-flags [public import]
       -> \0virtual:feature-flags [generated ESM containing projected flags]
  -> consumer source import -> browser module graph

source flags.json -> Vite watcher -> handleHotUpdate -> invalidate virtual module
                                             -> Vite reloads its importers
```

## Data flow

```text
flags.json (JSON object, may contain secrets)
  -> readExposedFlags(sourcePath, expose)
  -> validate root + requested keys
     -> error: "Feature flag <key> is missing in <sourcePath>"
  -> project { [key]: JSON value } only
  -> load(\0virtual:feature-flags) serializes projected object
  -> `export const flags = ...`
  -> consumer imports flags -> visible application result

file change
  -> handleHotUpdate(sourcePath match)
  -> invalidate virtual module
  -> Vite propagates update to virtual-module importers
```

## Evolution and verification

Adding another exposed flag changes only the consumer allow-list; the projection
and generated module remain unchanged. A future typed-schema feature can compose
before projection without widening the virtual module or exposing the full source
object. The compatibility contract is the existing factory and virtual import;
stricter source validation or renaming either is a breaking release.

Executed validation is recorded in the delivery response after implementation.
