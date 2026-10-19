# Selection export

This frontend capability has toolbar and keyboard entry points. Both export one
selection as one operation; no consumer needs a pausable preparation workflow.
The files in src are internal except for the two entry points below.

Both entry points are aliases of the workflow in `src/export-selection.mjs`.
Keep selection policy and encoding/transport sequencing there so toolbar and
keyboard behavior stays identical. Payload encoding is provided by the async
encoder in `src/codec.mjs`; the entry-point modules should only provide their
interaction-specific public names.

Keep these public contracts:

- `handleToolbarExport(rows, write)` and `handleKeyboardExport(rows, write)`.
- Rows are already validated internal data with `id` and `status`. Only `ready`
  rows are eligible. Preserve selection order; do not mutate the caller's rows.
- Empty selection returns `{ kind: 'empty' }`. Any ineligible row prevents all
  writes and returns `{ kind: 'blocked', ids }` naming the ineligible rows.
- Eligible selection is encoded, then writes exactly once with the encoded
  `{ schema: 1, document_ids: ids }` payload and returns `{ kind: 'sent', ids }`
  after acceptance. `write` is the existing trusted transport capability and
  borrows the payload without mutating it.
- The submitted IDs remain stable while awaiting encoding and acceptance. An
  encoding or transport failure rejects with the original error; it does not
  become a successful empty result.

Run `node --test test/*.test.mjs`.
