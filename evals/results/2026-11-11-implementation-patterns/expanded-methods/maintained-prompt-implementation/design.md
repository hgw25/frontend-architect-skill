# Selection export design

## Scope and existing guarantees

Unify toolbar and keyboard export behind one complete operation, preserving the
public contracts in [README](../README.md). Rows are validated internal values;
`write` is the trusted transport and borrows its payload without mutation. No
consumer needs a separately pausable preparation phase. The original ten tests
pass before implementation.

The original `begin` / `classify` / `encode` / `dispatch` protocol made both
callers own a sequence and share mutable intermediate state. It was replaced with
one async operation that owns that sequence. The module has no persistent state,
resource lifecycle, service identity or interchangeable policies to model.

## Two dependency-ordered increments

1. **Own the complete export operation.** Add `exportSelection(rows, write)` in
   `src/export-selection.mjs`. It returns empty for no selection, collects every
   ineligible ID before any write, snapshots eligible IDs in selection order,
   submits the schema-1 payload exactly once, then returns sent after acceptance.
   Check: exercise blocked, accepted and failed outcomes directly, and confirm
   that pending transport does not resolve or drift with selection edits. Full
   branch acceptance follows through both public entries in increment 2.
2. **Route both public entries to that operation.** Re-export the operation under
   the existing names in `src/toolbar.mjs` and `src/keyboard.mjs`; remove the
   internal step protocol. Existing consumers keep the same imports and async
   behavior. Check: run the unchanged public-entry suite and additional consumer
   regressions for multiple blocked rows, pending selection changes, and
   synchronous transport exceptions. Link this design from the README.

Both increments are complete. Increment 1 passed four focused shared-operation
regressions. Increment 2 passed the full 22-test consumer/shared suite and final
definition/caller cross-read.

## Code contract and ownership

The following contracts were cross-checked against the final declaration and
re-export statements; no separate entry-point wrapper functions remain:

| Location / operation | Inputs | Outcome and effects | Callers |
| --- | --- | --- | --- |
| `src/export-selection.mjs`: `export async function exportSelection(rows, write)` | `rows`: read-only sequence of `{ id, status }`; `write(payload)`: existing transport accepting `{ schema: 1, document_ids: ids }` | Promise of `{ kind: 'empty' }`, `{ kind: 'blocked', ids }`, or `{ kind: 'sent', ids }`; zero or one write; transport errors reject unchanged | Both public entry modules |
| `src/toolbar.mjs`: `handleToolbarExport` | Same `(rows, write)` | Re-export of `exportSelection`; original public name preserved | Toolbar and its tests |
| `src/keyboard.mjs`: `handleKeyboardExport` | Same `(rows, write)` | Re-export of `exportSelection`; original public name preserved | Keyboard and its tests |

The operation derives all decision data before awaiting `write`. It owns the ID
array, so later edits to caller-owned rows or the selection array cannot alter the
pending payload or returned intent. The trusted transport's non-mutation contract
permits sharing that snapshot between the payload and result; freezing or cloning
again would add no boundary protection required here. There is no retry, catch,
success fallback, partial write or mutable workflow context. Eligibility, payload
encoding and confirmation remain visible in execution order in one short function.

## Technical architecture

```text
Toolbar consumer  -> src/toolbar.mjs: handleToolbarExport ---+
                                                           |
Keyboard consumer -> src/keyboard.mjs: handleKeyboardExport -+
                                                           |
                       both re-export the same operation    v
             src/export-selection.mjs: exportSelection(rows, write)
                  owns eligibility, ID snapshot, schema and result
                                       |
                                       v
                    injected write(payload): trusted transport
                                       |
                         acceptance or original rejection
                                       v
                         caller's returned Promise
```

## Data flow

```text
caller rows + write -> public entry -> exportSelection
  |
  +-- rows.length === 0 ------------------------------> { kind: 'empty' }
  |
  +-- collect IDs of rows whose status !== 'ready'
         |
         +-- any blocked IDs ------------------------> { kind: 'blocked', ids }
         |
         +-- all ready -> copy IDs in selection order
                                |
                                v
                     write({ schema: 1, document_ids: ids }) once
                                |
                                +-- pending: snapshot retained; Promise pending
                                +-- rejection/throw -> caller rejects same error
                                +-- acceptance -----> { kind: 'sent', ids }
```

Both diagrams use labelled plain text and require no diagram toolchain. Empty and
blocked branches never reach the transport.

## Maintenance and verification

A likely follow-up is a schema change or eligibility change: edit the one owning
operation and exercise both public entries with the same consumer tests. A third
entry can re-export this operation without learning a preparation protocol. Keep
the trusted transport injected rather than importing UI state or adding a registry.
The intended public behavior stays unchanged, and the removed module is internal.

Executed on Node v22.22.2:

- Baseline `node --test test/export.test.mjs`: 10/10 passed.
- Increment 1 `node --test --test-name-pattern=shared: test/export-regression.test.mjs`:
  4/4 passed.
- Final `node --test test/export.test.mjs test/export-regression.test.mjs`:
  22/22 passed. The original suite covers empty, all-or-nothing eligibility,
  payload schema/order/single write, async rejection identity and pending row
  edits for both public entries. Additional regressions cover all blocked IDs,
  frozen input, whole-selection changes and pending settlement, and synchronous
  transport error identity through both entries and the shared operation.
- `node --check` passed for all three source modules and the new test module.
- Located the final shared declaration, both public aliases, and their test
  consumers with symbol search; read the source against both diagrams and this
  contract. The operation owns the full sequence and both callers supply only
  rows and transport. No old step-protocol references remain in source/tests/README.
- SHA-256 comparison confirmed the original test file and all 20 local skill
  files remain unchanged. No dependencies or runtime configuration were added.

The follow-up schema/eligibility change stays inside `exportSelection` and its
contract tests; neither entry needs sequencing changes. This preserves a small
change boundary without a new policy framework. No browser UI, DOM event binding
or real transport exists in this workspace, so those were not validated.
