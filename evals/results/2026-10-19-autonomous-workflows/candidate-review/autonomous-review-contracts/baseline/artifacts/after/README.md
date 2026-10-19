# Community workspace

This review snapshot contains the community module extracted from a React host.
It includes controller tests and source, not an installed application or browser
harness. Do not infer browser verification from the Node tests.

The product brief is in docs/community.md. Accepted decisions are indexed in
docs/decisions/index.md; a dated accepted decision supersedes its named section
of the brief. Draft decisions are not requirements. The team implementation notes
in docs/release-notes.md describe intended delivery but are not acceptance tests.

Runtime entry: src/community/index.mjs. React host bindings provide controller
snapshots as props and subscribe to the host's foreground event. Local resources
belong to a workspace instance and are disposed when the workspace is closed.
Run `node --test test/*.test.mjs` for fast checks.
