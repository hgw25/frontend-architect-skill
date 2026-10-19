# Selection export capability

## Requirement and current facts

Toolbar clicks and the keyboard shortcut are two triggers for the same selection
export. Both must preserve the public names documented in `README.md`, while the
eligibility rule, encoding protocol, transport behavior, and accepted result must
change together. `src/codec.mjs` is the supplied asynchronous owner of payload
encoding.

The rows are validated internal data. Export is all-or-nothing: an empty selection
does not encode or write, any non-ready row blocks the entire operation, and a ready
selection is snapshotted in order before asynchronous encoding starts. Only a
successfully encoded payload reaches the transport. Encoder and transport failures
remain rejected with their original error.

The existing single `exportSelection` operation remains the shared boundary. No
caller needs a pausable preparation workflow or direct access to an intermediate
encoded payload.

## Implementation sequence

This change has three dependency-ordered steps:

1. Keep `exportSelection(rows, write)` as the single owner of eligibility,
   submitted-intent capture, dispatch, and outcome. Completion: empty and blocked
   decisions finish without encoding or transport.
2. Delegate payload construction to `encodeSelection(ids)` and await it before
   dispatch. Completion: both entry points encode the captured IDs, write exactly
   once only after successful encoding, and preserve the original encoder failure.
3. Preserve `handleToolbarExport` and `handleKeyboardExport` as named re-exports of
   that operation. Completion: an identity check proves both entry points have one
   implementation, and the existing consumer suite passes unchanged.

## Code contracts and ownership

- `src/export-selection.mjs` owns `exportSelection(rows, write)`. It reads `rows`,
  snapshots IDs into a new array before the first asynchronous boundary, asks the
  codec to encode that snapshot, calls `write` at most once, and returns a decision
  or accepted result. It owns no persistent state and deliberately lets encoder and
  transport errors reject.
- `src/codec.mjs` owns asynchronous wire-payload construction through
  `encodeSelection(ids)`. The export operation consumes its returned payload only
  after the promise fulfills.
- `src/toolbar.mjs` and `src/keyboard.mjs` retain the existing public symbol names.
  They add no policy or lifecycle: each is a named re-export of `exportSelection`.
- `write(payload)` remains the trusted transport capability and receives the
  successfully encoded payload for a ready selection.

The concrete decision shapes remain `{ kind: 'empty' }`,
`{ kind: 'blocked', ids }`, and `{ kind: 'sent', ids }`. The exported IDs are a
snapshot, shared by the payload and result but not by the caller's mutable rows.

## Technical architecture

```text
[Toolbar UI]  -- handleToolbarExport --\
                                      > [exportSelection] --> [encodeSelection] --> write(payload) --> [Trusted transport]
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
    +-- snapshot ready IDs --> await encodeSelection(ids)
                                      |         |
                                      |         +-- rejects --> original encoder error; no write
                                      |
                                      +-- payload --> await write
                                                       |     |
                                                       |     +-- rejects --> original transport error
                                                       |
                                                       +-- accepted --> { kind: 'sent', ids }
```

## Verification and evolution

The existing entry-point suite is the consumer acceptance check. A separate shared
capability test proves both names expose the same function and rechecks stable IDs
across pending encoding and transport. The encoder integration checks prove encoding
finishes before dispatch and a failed encoding never writes. `node --test` and
`git diff --check` are the delivery checks.

A realistic next change is a schema version or payload field update. It remains
owned by the codec; neither the export operation nor either trigger module changes.
If toolbar and keyboard later acquire genuinely different product rules, each can
wrap the shared operation explicitly instead of adding mode flags to this contract.
