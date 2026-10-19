# Product and order filters

Technical design: [product and order filtering](docs/filtering-design.md).

This browser application uses native ES modules. `ui.mjs` contains the project's
labelled controls and buttons, and `query.mjs` provides the existing asynchronous
data access. Use the same public controls, data and URLs.

Products have keyword, category, publication status and stock availability. Users
edit a draft and press Apply. Reset restores published/all categories/all stock/
empty keyword. Orders have keyword, date range and order status; a valid edit takes
effect immediately.
Reset restores all statuses and the 30 calendar days ending on the project date
from `data.mjs`. Product and order status values describe different concepts.

The URL is the applied filter source. Keep unrelated parameters. Refresh and
browser history restore the appropriate applied fields. Product draft changes
must not start a query. Incomplete or reversed order dates remain editable and
show an associated error without changing the applied URL or results. Query
failures use a visible alert, and earlier responses cannot replace the current
result. Result counts describe the actual returned rows.

Keep the existing control labels, page links and Results list. Narrow containers,
long translated labels, keyboard operation and 200% text sizing must remain
usable without horizontal page overflow. Existing design-system functions in
ui.mjs may be extended while preserving their public behavior. There is no
animation or performance-optimization requirement. Run npm run check.
