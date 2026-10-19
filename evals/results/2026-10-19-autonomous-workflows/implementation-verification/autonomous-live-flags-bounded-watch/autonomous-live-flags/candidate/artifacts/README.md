# Project feature flags

`@frontend-architect-eval/feature-flags` exposes an explicit allowlist from a local
JSON file through a Vite virtual module. Unlisted values never enter generated
client modules or their source maps.

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

Add the declaration entry to the consumer's TypeScript configuration, then import
the flags. Values can be any JSON value.

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

```ts
import { flags } from 'virtual:feature-flags'
```

`source` accepts a file URL, an absolute filesystem path, or a path relative to
Vite's configured `root`. During development the file is watched and changes
invalidate the virtual module. Missing exposed names, invalid JSON, non-object
sources, and unreadable files fail with a diagnostic that names the source.

Client-side flags are visible to every application user and are not an
authorization mechanism. It is safe for the source file to contain server-only
values only when every client-visible key is explicitly listed in `expose`.

See [the technical design](docs/feature-flags-plugin.md) for lifecycle, data-flow,
and compatibility details. Run `npm run check` to build the package and exercise
workspace, development, diagnostics, and packed-consumer behavior.
