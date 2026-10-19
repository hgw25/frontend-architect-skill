# Project feature flags

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

Implementation details and the public contract are recorded in
[the feature-flags plugin design](docs/feature-flags-plugin.md).
