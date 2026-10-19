# Card reordering technical design

## Requirement and inspected facts

The board contains 80 cards with stable IDs. Users must be able to move a card
with its adjacent-move buttons or drag its handle onto another card. The visible
order changes immediately, repeated input remains usable while cards are moving,
and the newest order is eventually saved. A failed save stays visible and can be
retried. Hiding the board, resizing, scrolling, and reduced-motion preferences
must not leave visual work behind.

The current application already owns the card data and `saveOrder(ids)` transport,
but `draw()` replaces every node on each move, reads layout after every insertion,
and starts unordered saves. The implementation will keep `order` as the only
business-order fact. DOM order is its projection; animation geometry and save
snapshots never become competing order stores.

Acceptance is the existing browser suite: stable node identity and focus,
intermediate spatial movement, interruption without a jump, pointer/button order
parity, latest-save persistence with retry, lifecycle cleanup, and a static
reduced-motion result.

## Three dependency-ordered increments

1. **Persistent semantic board.** `mountBoard()` creates/reuses one card node per
   ID, and `applyOrder()` moves those nodes into `order`. Button and pointer
   operations call one `commitOrder(nextOrder)` boundary. Complete when button
   and drag operations produce the same DOM order and button focus follows the
   moved card.
2. **Interruptible spatial continuity.** `animateFrom(firstRects)` owns
   FLIP geometry and Web Animations handles. Reads are batched before/after the
   DOM write. New input measures the current visual positions, cancels old
   animations, commits the new DOM order, and starts from those measured
   positions. Hide and resize cancel; reduced motion skips animation. Complete
   when repeated moves do not snap backward and no running animation survives
   disposal.
3. **Latest-intent persistence.** `requestSave()` snapshots the latest `order` and
   advances a revision; `flushSave()` allows one write at a time and follows a
   successful old write with the newest snapshot. Failure blocks automatic
   retries, exposes an alert, and `retrySave()` submits the current newest
   snapshot. Complete when delayed acknowledgements cannot change the board or
   suppress a newer save, and failure/retry feedback is visible.

## Code contracts and ownership

- `order: string[]` in `src/app.mjs` is the sole mutable business order.
- `commitOrder(nextOrder: string[]): void` validates no external input; callers
  construct permutations from known card IDs. It measures, publishes `order`,
  projects DOM order, animates if appropriate, and requests persistence.
- `moveBy(id: string, delta: number): void` and
  `moveAfter(id: string, targetId: string): void` are interaction-specific pure
  order decisions followed by `commitOrder`.
- `cardElements: Map<string, HTMLLIElement>` preserves identity and listeners.
  `mountBoard()`/`unmountBoard()` own attachment; unmount cancels visual work.
- `activeAnimations: Map<Element, Animation>` contains only presentation state.
  Each replacement/cancel path removes its owned handle. The real DOM is already
  final before an inversion plays.
- The save owner keeps `desiredRevision`, `desiredSnapshot`, `saving`, and
  `saveBlocked`. A response may advance acknowledgement state and feedback, but
  never mutates `order`. Retry deliberately uses the current desired snapshot,
  because every local reorder represents the same replace-order resource.

## Technical architecture

```text
[Move buttons] -----\
[Pointer handle] ----> moveBy / moveAfter
                         |
                         v
                    commitOrder(next)
                    /        |         \
                   v         v          v
          order (authority) applyOrder  requestSave
                             |             |
                    persistent <li>s       v
                             |         flushSave
                             v             |
                    FLIP animation      saveOrder(ids)
                    owner/cleanup          |
                                          v
                                    HTTP /api/order

[Toggle / resize / reduced-motion] -> animation and mount lifecycle owner
```

## Representative data flow

```text
Enter or pointer-up
  -> moveBy(id, delta) / moveAfter(id, targetId)
  -> next ID permutation
  -> measure current visual rectangles
  -> cancel superseded animations
  -> publish order + append existing nodes in that order
  -> measure final rectangles
  -> reduced motion? yes: static final DOM
                     no: invert deltas -> play transforms to zero
  -> requestSave copies newest IDs and revision
  -> saving already? yes: retain newest snapshot for the next flush
                    no: saveOrder(submitted snapshot)
       -> success and newer revision exists: flush newest snapshot
       -> success and current: expose Saved status
       -> failure: expose alert + Retry save
            -> retry: clear block -> submit current newest snapshot

Hide/resize -> cancel all animation handles -> final DOM/disconnected board;
pending save completion may update feedback only and never remount the board.
```

## Verification and evolution

`npm run check` is the decisive real-Chromium check; its cost test records rather
than invents a performance threshold. Code inspection additionally checks that
all geometry reads are batched, no render path recreates cards, and every
animation owner has cleanup. The HTTP route is test-substituted, so this does not
claim production-service validation.

A realistic follow-up is adding “move to column” or keyboard reorder shortcuts.
Those inputs only need to produce a complete next-order permutation for
`commitOrder`; animation and save policy remain unchanged. Cross-tab ordering
would require a server version contract and is intentionally not implied by this
client-only queue.

### Verification record

- `node --check src/app.mjs` and `node --check src/api.mjs`: passed.
- `git diff --check`: passed.
- `npm run check`: blocked before product assertions because this evaluation
  sandbox rejects the configured server's `listen(127.0.0.1)` with `EPERM`.
- A direct Playwright Chromium launch was also attempted and blocked by the host
  sandbox's macOS Mach-port permission. The browser acceptance and recorded cost
  therefore remain unexecuted here; they must be run in a normal local or CI host.
