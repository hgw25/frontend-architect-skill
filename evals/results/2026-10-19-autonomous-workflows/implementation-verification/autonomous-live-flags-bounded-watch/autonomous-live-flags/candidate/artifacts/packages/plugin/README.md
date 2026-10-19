# @frontend-architect-eval/feature-flags

A Vite plugin that exposes an explicit allowlist from a local JSON feature-flag
file. Configure `featureFlags({ source, expose })`, add the package's `/virtual`
declaration entry to TypeScript's `types`, and import `{ flags }` from
`virtual:feature-flags`.

Only allowlisted keys are emitted into the client module. See the repository
README and technical design for the full API, security boundary, and development
watch behavior.
