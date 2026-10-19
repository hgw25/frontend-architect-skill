# Board card sorting

## Requirement and decisions

The board has 80 stable card IDs. A user can reorder cards with each card's
buttons or by dragging its `Move card N` handle onto another card. The visible
order changes immediately, the moved card keeps focus after a button command,
and a newer command always remains authoritative while an earlier save or
animation is pending. The existing HTTP endpoint is the persistence boundary;
the browser owns the optimistic display order.

The DOM list remains the board's public surface (`aria-label="Board"` and
`data-card-id`). `order` is the sole order fact. The renderer reuses keyed card
nodes instead of rebuilding the board, so focused controls and drag state remain
attached to their card. A small save coordinator owns one in-flight request and
one latest pending snapshot. It serializes requests and never lets an old
response change `order`; a failure is announced and exposes Retry save.

Spatial continuity matters for an 80-card grid. The board performs FLIP around
the synchronous DOM reorder: it measures every existing card before the order
mutation, writes the final order, measures once after it, then animates only
transform deltas. A new reorder captures the current visible geometry, then
cancels current animations before writing its new final layout. Hiding the board cancels animations and removes the list, so no
later callback can recreate it. Reduced motion skips the animation but keeps the
same final DOM state.

The pre-change attempt recorded a missing local Playwright executable
(`playwright: command not found`), so it is not a comparable browser-cost
baseline. After installing the lockfile dependencies, the supplied Chromium
check passed against the final code. It recorded the fixed 80-card,
1100×760, eight-operation reduced-motion scenario (wall time 179.19 ms; 23
layouts; 56 style recalculations). This is a final runtime sample, not a
before/after performance-improvement claim.

## Delivery sequence

1. Build keyed card nodes and the sole `order` mutation operation for buttons
   and drops. Check: moving any card updates the DOM order immediately and a
   button command leaves focus on the same card's initiating control.
2. Add FLIP lifecycle ownership and visibility cleanup. Check: repeated moves,
   resize, hide/show, and reduced-motion all end at the current DOM order with
   no active animation retaining removed nodes.
3. Add latest-snapshot persistence coordination and user-facing retry feedback.
   Check: several commands during a pending request persist the final snapshot;
   failure leaves the board order intact and Retry save resubmits it.
4. Run the real Chromium check with the supplied HTTP stub and inspect the final
   code/consumer contracts.

## Implemented contracts

| Owner | Contract | Responsibility |
| --- | --- | --- |
| `src/app.mjs`: `moveCard(id, targetIndex, focusControl?)` | card ID, final index, optional focused button → no value | Mutates the single `order` fact, updates keyed DOM order, starts a FLIP transition and schedules persistence. |
| `src/app.mjs`: `SaveCoordinator` | `schedule(ids)` / `retry()` | Owns in-flight/latest pending immutable order snapshots and visible save outcome; never publishes server order. |
| `src/api.mjs`: `saveOrder(ids)` | ID array → endpoint JSON | Existing HTTP transport, reused unchanged. |

## Technical architecture

```text
[Move buttons / draggable handle]
             |
             v
 [app.mjs moveCard + order (single source)]
      |                      |\
      |                      | \ schedule(snapshot)
      v                      |  v
[keyed card DOM] <--- FLIP --+ [SaveCoordinator] ---> [saveOrder] ---> HTTP /api/order
      |                         |                          |
      +--> focus / aria status <+-- success or Retry ------+
```

## Data flow

```text
User command (button or drag/drop)
  -> determine final index
  -> moveCard mutates `order`
  -> measure old rects -> append keyed nodes in new order -> measure new rects
  -> animate transform deltas (or static final state for reduced motion)
  -> SaveCoordinator.schedule([...order])
  -> POST /api/order(snapshot)
       -> success: if a newer snapshot exists, send it; otherwise announce Saved
       -> failure: keep current order, announce failure, expose Retry save
       -> retry: submit the newest current snapshot

Hide board -> cancel animations -> remove board DOM; no animation callback owns
or recreates the board.
```

## Verification and evolution

The follow-up change most likely to arrive is another reorder gesture or a save
result while an animation is active. `moveCard` remains the only place that
changes order and `SaveCoordinator` keeps network completion separate from that
state, so neither addition needs a second order store. The supplied Playwright
check is the decisive browser acceptance and cost check; it passed all six
checks on the final code and uses a stub service, not production-service
evidence.
