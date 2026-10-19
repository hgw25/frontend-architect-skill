# Project feature flags

A Vite plugin that exposes an explicit, client-safe subset of a JSON feature flag
file. Unlisted values are never emitted into the virtual module, client bundle, or
source maps.

## Usage

Configure the plugin with a path relative to the Vite project root, or with a file
URL:

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

Add the virtual-module declaration package to the consumer's TypeScript config:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Flags can then be imported by application code:

```ts
import { flags } from 'virtual:feature-flags'
```

Flag values may be any JSON value. Every name in `expose` must exist in the source
object; otherwise the build reports the missing key and source filename. During
development, edits to the JSON source invalidate the virtual module and update its
consumers.

Run `npm run check` to build the package and exercise workspace, development,
diagnostic, and packed-package consumers.
