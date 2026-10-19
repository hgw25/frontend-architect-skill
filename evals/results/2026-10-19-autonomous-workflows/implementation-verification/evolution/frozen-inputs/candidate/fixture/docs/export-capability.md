# Selection export capability

## Requirement and current facts

Toolbar clicks and the keyboard shortcut are two triggers for the same selection
export. Both must preserve the public names documented in `README.md`, while the
eligibility rule, payload protocol, transport behavior, and accepted result must
change together.

The rows are validated internal data. Export is all-or-nothing: an empty selection
does not write, any non-ready row blocks the entire write, and a ready selection is
snapshotted in order before the asynchronous transport starts. Transport failures
remain rejected with their original error.

The current staged `begin`/`classify`/`encode`/`dispatch` API exposes sequencing and
mutable intermediate state even though no caller needs a pausable workflow. The
shared boundary will therefore be one operation rather than a configurable pipeline.

## Implementation sequence

This change has two dependency-ordered steps:

1. Add `exportSelection(rows, write)` as the single owner of decision, payload
   construction, dispatch, and outcome. Completion: the consumer suite reaches the
   operation through both aliases and covers empty, blocked, ready, failure, input
   immutability, and pending-write stability.
2. Preserve `handleToolbarExport` and `handleKeyboardExport` as named re-exports of
   that operation and remove the staged implementation. Completion: an identity
   check proves both entry points have one implementation, and the existing consumer
   suite passes unchanged.

## Code contracts and ownership

- `src/export-selection.mjs` owns `exportSelection(rows, write)`. It reads `rows`,
  snapshots IDs into a new array, calls `write` at most once, and returns a decision
  or accepted result. It owns no persistent state and deliberately lets transport
  errors reject.
- `src/toolbar.mjs` and `src/keyboard.mjs` retain the existing public symbol names.
  They add no policy or lifecycle: each is a named re-export of `exportSelection`.
- `write(payload)` remains the trusted transport capability and receives exactly
  `{ schema: 1, document_ids: ids }` for a ready selection.

The concrete decision shapes remain `{ kind: 'empty' }`,
`{ kind: 'blocked', ids }`, and `{ kind: 'sent', ids }`. The exported IDs are a
snapshot, shared by the payload and result but not by the caller's mutable rows.

## Technical architecture

```text
[Toolbar UI]  -- handleToolbarExport --\
                                      > [exportSelection] -- write(payload) --> [Trusted transport]
[Keyboard UI] -- handleKeyboardExport-/          |
                                                  +-- outcome / original rejection --> caller
```

The two UI modules are compatibility-facing names. All selection and protocol
knowledge is hidden behind the shared operation.

## Data flow

```text
rows + write
    |
    v
exportSelection -- no rows ------------------------------> { kind: 'empty' }
    |
    +-- collect non-ready IDs -- any ---------------------> { kind: 'blocked', ids }
    |
    +-- snapshot ready IDs --> payload --> await write
                                      |         |
                                      |         +-- rejects --> original error
                                      |
                                      +-- accepted ----------> { kind: 'sent', ids }
```

## Verification and evolution

The existing entry-point suite is the consumer acceptance check. A separate shared
capability test proves both names expose the same function and rechecks stable IDs
while `write` is pending. `node --test` passes all 12 tests after implementation;
`git diff --check` also passes.

A realistic next change is a schema version or payload field update. It remains a
single edit in `exportSelection`; neither trigger module changes. If toolbar and
keyboard later acquire genuinely different product rules, each can wrap the shared
operation explicitly instead of adding mode flags to this contract.
