# Project feature flags

A Vite 8 plugin that exposes an explicit, client-safe subset of a JSON feature
flag file through a virtual module. It is an ESM package and accepts any JSON value.

## Configure Vite

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

`source` may be a file URL, an absolute path, or a path relative to the Vite
process's current working directory. It must contain a JSON object. `expose` is
the client allowlist: all other properties are excluded before module code or
source maps are generated. A missing exposed name fails with a diagnostic that
identifies both the name and source file.

For TypeScript, load the packaged ambient declaration:

```json
{
  "compilerOptions": {
    "types": ["@frontend-architect-eval/feature-flags/virtual"]
  }
}
```

Application modules can then import the flags:

```ts
import { flags } from 'virtual:feature-flags'

if (flags.checkoutV2) {
  // render the enabled experience
}
```

During development, edits to the JSON source invalidate the virtual module and
become visible through Vite's update pipeline. Production builds embed only the
allowlisted snapshot. This plugin controls client exposure, not user authorization;
privileged operations still require server-side authorization.

## Development

Run the complete build, type, production, development, diagnostic, and packed
consumer checks with:

```sh
npm run check
```

The implementation contracts and lifecycle are documented in
[the feature flags plugin technical design](docs/feature-flags-plugin-design.md).
