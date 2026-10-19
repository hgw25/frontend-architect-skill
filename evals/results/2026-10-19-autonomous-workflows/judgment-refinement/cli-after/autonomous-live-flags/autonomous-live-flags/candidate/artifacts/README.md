# Project feature flags

The package design and its ownership boundaries are recorded in
[docs/feature-flags-plugin-design.md](docs/feature-flags-plugin-design.md).

Applications import flags from virtual:feature-flags. The existing consumer uses
featureFlags({ source, expose }) in its Vite configuration; source is a filesystem
path or file URL to a JSON object, expose lists the flag names allowed in clients.
Flag values are JSON values. Values outside expose can contain server secrets and
must never appear in client JavaScript or source maps. Missing exposed names must
produce an error naming the key and source file.
A change to the JSON file during development must become visible to consumers.
Both the workspace consumer and a separately installed packaged consumer must work.
The package is ESM with public types and virtual-module declarations; keep the
existing consumer API. Run npm run check.

## Usage

```ts
// vite.config.ts
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

```ts
import { flags } from 'virtual:feature-flags'
```

Add `"@frontend-architect-eval/feature-flags/virtual"` to `compilerOptions.types`
to make the virtual import available to TypeScript. The plugin validates its JSON
source before Vite starts, so invalid JSON, a non-object root, unreadable files,
and missing allow-listed flags fail with the source-file context.
