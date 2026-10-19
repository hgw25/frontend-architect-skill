# `@frontend-architect-eval/feature-flags`

A Vite 8 plugin that exposes an explicit, client-safe subset of a local JSON
feature-flag file through a virtual module.

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

Add the declaration entry point to the consumer's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Then import the allow-listed values:

```ts
import { flags } from 'virtual:feature-flags'
```

`source` accepts a file URL, an absolute path, or a path relative to Vite's
project root. The source must contain a JSON object and every name in `expose`
must exist. Source changes invalidate the virtual module during development.
Only exposed values are used to generate client code and source maps.
