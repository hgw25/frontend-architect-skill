# Feature flags Vite plugin

This workspace contains `@frontend-architect-eval/feature-flags`, a Vite plugin
that publishes a deliberately selected subset of a JSON file to browser code.
Unexposed values are never included in generated JavaScript or source maps.

## Use

Register the plugin in `vite.config.ts`. A string source is resolved relative to
Vite's project root; an absolute path or `file:` URL can also be used.

```ts
import { featureFlags } from '@frontend-architect-eval/feature-flags'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    featureFlags({
      source: './flags.json',
      expose: ['checkoutV2', 'theme'],
    }),
  ],
})
```

Import the immutable flag map from the virtual module in application code:

```ts
import { flags } from 'virtual:feature-flags'

if (flags.checkoutV2) {
  // Render the new checkout.
}
```

Add the package's virtual-module declarations to a consumer TypeScript config:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Flag values may be any JSON value. The JSON root must be an object, and every
name in `expose` must exist. Invalid JSON, missing files, non-object roots, and
missing exposed names stop the build with an error that identifies the source
file. During development, changes to the JSON source invalidate the virtual
module and are sent through Vite's normal hot-update pipeline.

## Workspace verification

Run the complete build, type, production-output, development, diagnostics, and
packed-consumer checks with:

```sh
npm run check
```
