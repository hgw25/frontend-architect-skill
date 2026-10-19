# Project feature flags

`@frontend-architect-eval/feature-flags` is a Vite 8 plugin that exposes an explicit
allowlist from a JSON file as `virtual:feature-flags`. Unlisted values are never
included in the generated module or its source map, so the source may also hold
server-only configuration.

## Configure Vite

```ts
import { featureFlags } from '@frontend-architect-eval/feature-flags'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    featureFlags({
      source: new URL('./flags.json', import.meta.url),
      expose: ['checkoutV2', 'theme'],
    }),
  ],
})
```

`source` accepts a filesystem path or a `file:` URL to a JSON object. Relative
paths resolve from the process working directory. `expose` is the complete list of
keys allowed in client code. Values can be any JSON value. Missing keys, unreadable
files, invalid JSON, and non-object roots fail with a source-specific diagnostic.

The source file is watched in development. When it changes, the plugin invalidates
the virtual module so the next update reads and projects the current values.

## Import flags

Add the declaration entry to the consumer's TypeScript configuration:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Then import the generated snapshot:

```ts
import { flags } from 'virtual:feature-flags'

console.log(flags.checkoutV2)
```

The package is ESM-only and declares Vite 8 as a peer dependency. Its architecture,
failure behavior, and verification map are recorded in
[`docs/feature-flags-plugin-design.md`](docs/feature-flags-plugin-design.md).

Run `npm run check` to build the package and verify types, production isolation,
development updates, diagnostics, and the packed artifact.
