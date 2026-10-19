# Board reordering design

## Outcome and inspected facts

The board must keep one authoritative card order while mouse, touch, and keyboard
users move cards repeatedly. Every successful intent updates that order immediately,
keeps the moved card's DOM identity and keyboard focus, and saves the newest order.
Motion explains the old-to-new position without becoming business state. Hiding,
scrolling, resizing, reduced-motion preferences, or a failed save must leave a
correct static board.

The existing app already provides stable card IDs in `src/data.mjs` and the
`saveOrder(ids)` transport in `src/api.mjs`. The current `draw()` recreates the
whole application and interleaves a layout read with every card write; it therefore
cannot preserve focus or animate stable elements. The save response is not
authoritative board data and must never replace local order.

Acceptance is the browser-observable contract in `tests/board.spec.mjs`: buttons
and the `Move card N` handle produce the same order, repeated input remains
continuous, focus follows the same card, saves converge after an older request,
failures offer Retry, disposal leaves no animation work, and reduced motion reaches
the static final state. `tests/cost.spec.mjs` records browser work for 80 cards but
does not establish an online-service result.

## Three dependency-ordered implementation steps

1. **Establish stable board identity and one reorder operation.** `src/app.mjs`
   creates each card element once, keeps `order: string[]` as the only business
   order, and exposes `moveCard(cardId, destinationIndex)` to button and pointer
   callers. It updates the array and minimally reorders the existing list children;
   boundary-button state is derived afterward. Complete when button and pointer
   paths produce the same visible `data-card-id` order and keyboard focus survives.
2. **Preserve spatial continuity.** Around that same atomic reorder, `runFlip`
   batch-measures the visible cards (First), commits the DOM order (Last), cancels
   prior animation after capturing each current visual position, then
   plays translation-only Web Animations (Invert/Play). Active animation handles
   belong to the board view and are cancelled on resize, scroll, or hide. Reduced
   motion skips measurements and animation. Complete when a move has an intermediate
   visual position, repeated input has no snap-back, and disposal leaves no running
   animations.
3. **Converge persistence and feedback.** `requestSave()` increments a local
   revision and `flushSave()` serializes snapshots. Completion may update only save
   feedback; if a newer revision exists it sends that newest snapshot next. Failure
   pauses automatic flushing and exposes Retry, which sends the current order.
   Complete when delayed success followed by newer failure cannot alter the DOM,
   Retry sends the newest order, and success is announced.

## Code contracts and ownership

- `order` (`src/app.mjs`) owns business position. Card elements, drag state, save
  status, and animation handles are supporting UI/effect state and never duplicate
  an alternative order.
- `moveCard(cardId, destinationIndex): void` validates only caller-reachable board
  bounds, calculates the affected stable IDs, commits the new order, synchronizes
  existing DOM nodes, updates controls, animates when allowed, and requests a save.
  A no-op does not animate or save.
- `syncListOrder(): void` is the DOM projection of `order`. It moves existing nodes
  instead of recreating them, preserving identity, focus, and listener ownership.
- `runFlip(firstRects): void` owns Web Animation handles and cleanup.
  The invariant is that DOM/business order is final before inversion plays. A new
  transition samples current visual geometry and replaces prior handles. All visible
  cards are included because unequal card heights can change CSS Grid row geometry
  beyond the moved index range; reads remain batched into one First and one Last pass.
- Pointer state is scoped to a single handle gesture. Dropping over another card
  moves the dragged card to that card's original index; capture loss or board hide
  clears the gesture with no order change. Up/down buttons remain the non-dragging
  and keyboard alternative.
- `requestSave()` / `flushSave()` own transport sequencing. At most one request is
  in flight. Failure details and Retry are visible; stale acknowledgements cannot
  publish business state. Hiding the board changes only view presence.

## Technical architecture

```text
cards (stable ID/content) ----> card element factory ----> cardElements Map
                                      |                         |
button handlers ----+                 |                         v
pointer gesture ----+--> moveCard(id, destination) --> order --> <ol> DOM projection
                                      |                 |            |
                                      |                 |            +--> FLIP animations
                                      |                 |                 (view-owned handles)
                                      |                 +--> derived boundary controls
                                      v
                              requestSave(revision)
                                      |
                                      v
                          flushSave(latest snapshot) ----> saveOrder(ids) ----> HTTP
                                      |
                                      +--> status / alert / Retry UI

toggle / resize / scroll -----------------------------> view and animation cleanup
```

## Representative data flow

```text
Enter on card 1 "Move down"
  -> moveCard("1", 1)
  -> [First: affected visual rects]
  -> order splice: [1,2,...] => [2,1,...]
  -> syncListOrder() moves the existing node; updateMoveButtons()
  -> [Last: final rects] -> translate delta -> animate to transform:none
  -> requestSave() records revision 1 and flushSave([2,1,...])
       | success and no newer revision -> announce "Saved"
       | success with revision 2 pending -> flush newest snapshot
       ` failure -> show alert + Retry
                     -> flush current order (never a response-derived order)

Interruption branch:
second move during animation -> sample current visual rect -> commit newest order
  -> cancel old handles -> animate from sampled rect to newest final rect.
hide / resize / scroll / reduced motion -> cancel or skip motion -> static DOM remains final.
```

## Verification and evolution

The unchanged Playwright board acceptance and browser-cost checks passed in Chromium
151.0.7922.34 on 2026-10-19: 6/6 tests. They exercised focus, intermediate and final
geometry, pointer order, delayed and failed saves, Retry, view disposal, and reduced
motion. The fixed reduced-motion cost sample (80 cards, 8 button operations,
1100x760 viewport) recorded 15 layouts, 24 style recalculations, 0.001746 seconds of
layout duration, and 179.3 milliseconds wall time. These are local browser results,
not online-service acceptance or a general device performance claim.

A realistic follow-up is adding “move to top”. It should call the existing
`moveCard(id, 0)` contract, reusing the geometry mapping and save sequencing
without changing state ownership. This tests that the destination-index seam is
useful today and not tied only to adjacent buttons.
