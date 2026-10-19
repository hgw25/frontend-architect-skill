# Team invitations implementation design

## Outcome and established contracts

The page lets a user submit one email invitation, see the accepted invitation in
the current list, reorder that list locally, and refresh the workspace overview.
The existing native-ESM stack and `src/transport.mjs` are retained. A successful
`sendInvitation(email)` response is authoritative for the invitation; the
follow-on `readOverview()` is an independent projection and may fail without
retracting or misreporting that accepted send.

The public DOM contract remains: the Email and Team note fields, Send invitation
and Refresh overview buttons, the `Invitations` list, `data-invite-id` rows, and
the `data-testid="overview"` region. Native controls own their editable values so
unrelated list and overview updates do not replace active input or selection.
Dynamic send confirmations use a status region; send and overview failures use
separately owned alert regions.

## Functional sequence

Implementation has three dependency-ordered steps:

1. **Build stable page regions.** `src/app.mjs` creates the form, overview, list,
   and note once, then exposes narrow update operations for each region. Complete
   when initial data appears through the existing public DOM contract and drafts
   remain mounted during other updates.
2. **Implement local list commands.** `moveInvitation(id, delta)` updates the
   display-order model and moves the existing row node; `appendInvitation(row)`
   adds an accepted result. Boundary move buttons become unavailable. Complete
   when moves make no requests and repeated keyboard activation stays on the same
   logical button.
3. **Implement independent asynchronous commands.** `submitInvitation()` guards
   duplicate activation, snapshots the submitted email and edit revision,
   publishes an accepted invitation before requesting overview synchronization,
   and clears only an untouched submitted draft. `refreshOverview()` owns a
   latest-request identity and its own pending/error state. Complete when success,
   command failure, and successful-send/failed-refresh branches show honest,
   accessible outcomes without disturbing later input.

## Code contracts and ownership

- `src/transport.mjs` (reused, unchanged) owns HTTP method, payload, status, and
  JSON decoding for `sendInvitation(email)` and `readOverview()`.
- `src/app.mjs` owns the page's in-memory invitation order and overview
  projection. `createInvitationRow(invitation)` binds one stable DOM row to local
  move commands; `updateMoveAvailability()` derives boundary button state.
- `submitInvitation(event): Promise<void>` owns only the send lifecycle. Its
  internal `sending` guard ensures one activation produces one POST. The Email
  input remains editable; an incrementing edit revision distinguishes an
  untouched submitted draft from later edits, including edit-away-and-back.
- `refreshOverview(): Promise<void>` owns overview synchronization. A monotonically
  increasing request identity allows only the newest read to publish data, error,
  or pending cleanup. It never modifies invitation acknowledgement or send
  feedback.
- The DOM owns Email and Team note draft values and focus. No asynchronous
  completion restores focus, so it cannot steal focus from later interaction.

No generic store or request framework is introduced: the page has one lifetime,
one write command, and one independently refreshable projection, so named local
operations keep the policies visible with less indirection.

## Technical architecture

```text
[Native controls / stable DOM]
  form --submit--> submitInvitation() --email--> sendInvitation(email)
  refresh button -> refreshOverview() ----------> readOverview()
  move buttons --> moveInvitation(id, delta)
                         |                 [src/transport.mjs]
                         v                         |
              [invitation order + row nodes]      v
                         |                 [/api service boundary]
                         v
              updateMoveAvailability()

submitInvitation() --accepted row--> appendInvitation()
submitInvitation() --follow-on sync-> refreshOverview()
refreshOverview() ----projection----> overview text / overview alert
```

Dependencies point from the page controller to the existing transport. DOM
regions do not call each other; the send controller explicitly initiates the
follow-on overview synchronization after acknowledgement.

## Representative data flow

```text
Email input (draft value, edit revision)
  -> submit event snapshots { email, revision }
  -> duplicate guard + native form validity
  -> sendInvitation(email) -> POST /api/invitations
     -> failure: send alert; keep draft and list; enable submit
     -> success: { invitation, receipt }
        -> appendInvitation(invitation) -> visible row
        -> send status includes accepted email
        -> clear Email only when current revision == submitted revision
        -> enable submit
        -> refreshOverview() -> GET /api/overview
           -> newest success: publish pending count
           -> newest failure: keep prior count + overview alert + retry button
           -> stale completion: publish nothing

Move button -> moveInvitation(row id, +/-1)
  -> reorder in-memory rows -> move the same DOM node -> update edge disabled states
  -> focus remains on the same button; no transport call
```

## Verification and evolution

Browser acceptance must verify the existing three consumer paths plus: repeated
keyboard reorder without refocusing; a delayed send while Email and Team note are
edited; duplicate submission suppression; send rejection; and accepted send with
failed overview refresh. Static inspection must confirm transport calls remain at
the two intended boundaries and all async feedback has an accessible live role.

A realistic next change is adding invitation cancellation. Stable per-row nodes
and the page-owned row/order operations provide a local seam for another row
command, while server mutation and its acknowledgement can receive a separate
controller without coupling it to overview errors or draft ownership.

## Implementation evidence

Implemented on 2026-10-19. The final code retains the contracts and ownership
described above: `submitInvitation`, `refreshOverview`, `moveInvitation`,
`createInvitationRow`, and `appendInvitation` are defined in `src/app.mjs` and
called by the stable native controls described in both diagrams.

- `node --check src/app.mjs` passed.
- `git diff --check` passed.
- `npm run check` passed all 7 Chromium tests: the three supplied acceptance
  tests and four added boundary tests covering partial overview failure, edits
  during a pending send, repeated keyboard reorder focus, and send rejection.
- Final source inspection confirmed that list commands do not call transport,
  send acknowledgement is published before the independent overview refresh,
  and no asynchronous completion replaces the form or restores focus.
