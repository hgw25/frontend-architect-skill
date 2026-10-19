# Board reordering technical design

## Outcome and contracts

The board has one authoritative in-memory order: the array of stable card IDs. A
successful button or pointer gesture updates that array and the DOM immediately.
The existing `saveOrder(ids)` transport remains the server boundary; saves are
serialized and coalesced so that an acknowledgement for an older snapshot cannot
replace newer intent. A failed save leaves the visible order intact, exposes an
alert, and retries the newest unsaved snapshot on request.

Cards keep their DOM identity across moves. This preserves focus and makes the
same reorder operation usable by buttons and the drag handle. FLIP animation is
a presentation of the already-committed order, never a second ordering state.
Rapid input starts from current on-screen geometry; hiding the board or resizing
cancels owned animations. Reduced-motion users receive the same final order with
no animation.

## Dependency-ordered implementation

There are three implementation steps:

1. **Stable board view.** Build each card once, retain an ID-to-element map, and
   move existing nodes for every order change. Complete when button reordering
   preserves card identity, focus, and `data-card-id` order.
2. **Continuous interaction.** Route button and pointer-drop intents through one
   reorder operation. It measures all first rectangles in one read phase, commits
   order and DOM in one write phase, measures last rectangles, then plays
   transform-only FLIP animations. An incoming intent samples current visual
   geometry before replacing animations. Complete when repeated moves remain
   continuous, dragging produces the same order, and hide/resize/reduced-motion
   paths settle without running animation work.
3. **Ordered persistence.** Add a small save coordinator beside the board state.
   It permits one request at a time, retains only the latest waiting snapshot,
   and owns saving/success/error/retry feedback. Complete when delayed success,
   later failure, and retry persist the newest order without changing the view.

`src/app.mjs` owns board order, card/view identity, pointer gesture state,
animation handles, and the save coordinator because this page is their only
consumer and lifecycle owner. `src/api.mjs` remains a narrow HTTP adapter.

## Technical architecture

```text
Native buttons / pointer events
             |
             v
  Board controller (`src/app.mjs`)
  - order + stable cardNodes
  - reorderCard(id, destination)
  - animation handles / cleanup
             |                    \
             | DOM node move       \ requestSave(order snapshot)
             v                      v
  Semantic `<ol>` view       Save coordinator (`src/app.mjs`)
  + WAAPI FLIP motion               |
                                    | saveOrder(ids)
                                    v
                              HTTP adapter (`src/api.mjs`)
                                    |
                                    v
                              `/api/order`
```

## Data flow

```text
button click or pointer drop
  -> derive destination from current `order`
  -> measure current card rectangles
  -> mutate the sole `order` array and move the existing `<li>`
  -> measure final rectangles
  -> if motion allowed: replace owned FLIP animations from current to final
     else: show final layout immediately
  -> enqueue a copied order snapshot
  -> if idle: POST snapshot
       success + newer snapshot -> POST newer snapshot
       success + no newer snapshot -> announce Saved
       failure -> retain newest unsaved snapshot + show alert/Retry
       retry -> POST retained snapshot -> success announcement or alert again
```

## Verification and evolution

The browser acceptance suite checks button focus and identity, interrupted
movement, pointer parity, delayed/out-of-order save conditions, retry, lifecycle
cleanup, and reduced motion. The fixed interaction cost test records real browser
layout/style/script counters; batched geometry reads avoid the former
write-then-layout-read loop.

A realistic follow-up is adding “move to column/index.” It only needs to derive a
destination index and call the same reorder operation; animation, DOM identity,
and persistence policy remain unchanged. Multi-client conflict resolution would
instead require a server version contract and belongs at the transport/save
boundary, not in animation state.
