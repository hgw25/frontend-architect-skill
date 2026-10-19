# Project feature flags

A Vite plugin that exposes an explicit, client-safe subset of a JSON feature flag
file through a typed virtual module. Values not named in `expose` are never added
to generated JavaScript or source maps.

## Usage

```ts
// vite.config.ts
import { featureFlags } from '@frontend-architect-eval/feature-flags'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    featureFlags({
      // Relative paths are resolved from Vite's project root. File URLs and
      // absolute filesystem paths are also supported.
      source: './flags.json',
      expose: ['checkoutV2', 'theme'],
    }),
  ],
})
```

Add the virtual-module declaration to the consumer's TypeScript configuration:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Then import the selected values in application code:

```ts
import { flags } from 'virtual:feature-flags'

console.log(flags.checkoutV2)
```

The source must contain a JSON object. Flag values may be any JSON value. Build
and development startup fail with a diagnostic naming both the missing key and
source file when an exposed key is absent. During development, edits to the JSON
file invalidate the virtual module and flow through Vite's normal HMR handling.

Run `npm run check` to build the package and exercise its consumer scenarios.
