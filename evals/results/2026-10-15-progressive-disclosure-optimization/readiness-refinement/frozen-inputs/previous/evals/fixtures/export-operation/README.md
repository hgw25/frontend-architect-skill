# Selection export

This frontend capability has toolbar and keyboard entry points. Both export one
selection as one operation; no consumer needs a pausable preparation workflow.
The files in src are internal except for the two entry points below.

Keep these public contracts:

- `handleToolbarExport(rows, write)` and `handleKeyboardExport(rows, write)`.
- Rows are already validated internal data with `id` and `status`. Only `ready`
  rows are eligible. Preserve selection order; do not mutate the caller's rows.
- Empty selection returns `{ kind: 'empty' }`. Any ineligible row prevents all
  writes and returns `{ kind: 'blocked', ids }` naming the ineligible rows.
- Eligible selection writes exactly once with `{ schema: 1, document_ids: ids }`
  and returns `{ kind: 'sent', ids }` after acceptance. `write` is the existing
  trusted transport capability and borrows the payload without mutating it.
- The submitted IDs remain stable while awaiting acceptance. A transport failure
  rejects with the original error; it does not become a successful empty result.

Run `node --test test/export.test.mjs`. The starting implementation passes every
check. These checks establish behavior, not cohesion or an appropriate call API.
There is no required function count, filename layout, class or line budget.

