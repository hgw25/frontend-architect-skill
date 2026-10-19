# Board sorting technical design

## Outcome and current facts

The board must accept adjacent button moves and pointer dragging while keeping one
authoritative `order` array. A successful intent updates that order and the DOM
immediately. The same card node and logical control remain active across a move.
Persistence may lag behind interaction, but the last acknowledged request must
represent the newest order; failures remain visible and retryable.

The application is native ESM with stable card IDs and an existing `saveOrder(ids)`
API. The current renderer replaces the entire application for every move, has no
drag behavior, swallows save errors, and interleaves a layout read with every card
write. Those behaviors cannot support continuity or bounded rendering work.

## Three implementation steps

1. **Create a stable board view.** `src/app.mjs` creates the shell and each card
   node once per board mount, keeps an ID-to-node map, and reorders those nodes from
   `order`. Button and pointer intents both call the same reorder operation. Check:
   button and drag paths produce the expected IDs, while focus remains on the moved
   card's control.
2. **Add interruptible spatial continuity.** The reorder owner captures visual
   rectangles, commits `order` and DOM order, then plays translation-only FLIP
   animations. A new intent samples the current visual positions and replaces old
   animations; resize, reduced motion, and unmount cancel to the already-correct
   DOM state. Check: intermediate geometry changes, rapid moves do not jump back,
   reduced motion runs no animation, and disposal leaves no running work.
3. **Serialize latest-order persistence.** A small save coordinator owns one
   in-flight snapshot and one replaceable pending snapshot. Success drains the
   latest pending value; failure retains the current order for an explicit retry
   and never mutates UI order. Check: delayed success followed by a newer failed
   save exposes an alert, and retry sends the newest IDs and reaches Saved.

## Contracts and ownership

- `order: string[]` is the only business-order state. DOM order and request
  snapshots are projections; animation transforms never become ordering data.
- `moveBy(id, delta)` and `moveToCard(id, targetId)` validate positional intent,
  compute a new order, and call `commitOrder(nextOrder)`.
- `commitOrder(nextOrder)` owns the atomic business/DOM transition, focus
  continuity, FLIP measurement, and persistence enqueue.
- `mountBoard()` owns card nodes and pointer handlers for a visible board;
  `unmountBoard()` releases pointer state and all animation handles. Show/hide does
  not reset `order` or allow an async save to remount UI.
- `enqueueSave(ids)`, `flushSave()`, and `retrySave()` own save ordering and
  feedback. At most one request is in flight; pending data is replaced by the most
  recent immutable snapshot. Network failures are displayed, not converted into
  a fallback order.

Plain functions and module-owned state fit the application's single board and
lifetime; a class or generalized store would add substitution machinery without a
second consumer.

## Technical architecture

```text
Move buttons ----\
                  > reorder intent -> Board/order owner -> stable card DOM
Pointer handle --/                         |                   |
                                            |                   +-> FLIP owner
                                            v                       (Web Animations)
                                    Save coordinator
                                            |
                                            v
                                      saveOrder(ids)
                                            |
                                            v
                                      /api/order

Visibility toggle -> mountBoard()/unmountBoard() -> DOM + animation cleanup
Media/resize -------------------------------------> animation cancellation
```

## Representative data flow

```text
Enter / pointer-up
  -> moveBy(id, delta) / moveToCard(id, targetId)
  -> derive nextOrder from current order
  -> capture current visual rectangles
  -> commit order = nextOrder
  -> move existing nodes into nextOrder DOM order
  -> restore the same logical control only if the move disrupted its focus
  -> measure final rectangles -> animate current-to-final translation
       reduced motion / resize / unmount -> cancel -> final DOM stays authoritative
  -> enqueue immutable IDs snapshot
  -> saveOrder(snapshot)
       success + newer pending -> save newest pending snapshot
       success + no pending -> announce Saved
       failure -> retain newest order -> show alert + Retry
       Retry -> enqueue current order -> success -> announce Saved
```

## Verification and evolution

`npm run check` exercises the real Chromium consumer for button focus, intermediate
and repeated motion, drag equivalence, ordered failure/retry, resize/disposal,
reduced motion, and an 80-card fixed-cost sample. The pre-change attempt could not
start because dependencies were not installed; executed evidence is recorded here
after implementation.

A realistic next change is moving a card to a different column. The intent layer
can add `moveToColumn(...)` while reusing `commitOrder`; if columns later become
separate authoritative lists, that is the point to replace the single-array
contract rather than hiding multiple lists behind today's API.

## Implementation reconciliation

Implemented with the named operations and ownership above. `npm run check` passed
all 6 Chromium tests on 2026-10-19. The fixed reduced-motion sample used Chromium
151.0.7922.34, 80 cards and 8 operations; it recorded 23 layouts (8.303 ms layout
duration), 48 style recalculations (3.076 ms), 5.695 ms script duration, 83.834 ms
task duration, and 224.031 ms test-wall time. These are local raw browser metrics,
not a production-service or cross-device performance claim.
