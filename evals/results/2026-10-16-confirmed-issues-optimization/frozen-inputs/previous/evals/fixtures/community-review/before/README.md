# Community workspace

Community pages let signed-in members discover releases, browse creators and
publish a new release. Product requirements live in docs/community.md.
Component interactions are owned in src/community/ui; data operations are in
src/community/controllers. Shared transport is injected at the page boundary.
Run `node --test test/*.test.mjs` for the fast checks.
