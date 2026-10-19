# Team invitations: interaction design

## Requirement and facts

The page owns the already-loaded invitation rows and workspace overview supplied
by `src/data.mjs`. `src/transport.mjs` owns HTTP status handling and exposes two
operations: `sendInvitation(email)`, which confirms the new invitation and its
receipt, and `readOverview()`, which reads the independent pending count.

The page must submit one request per activation, show the accepted invitation,
refresh the overview after a confirmed send, and allow a later overview retry.
The list is local presentation state: moving an item must never call a service
and keyboard focus must remain on the moved item's same action. While sending,
the email draft and team-note draft remain editable. A successful send remains a
success if the follow-up overview read fails.

The relevant operation policy is guarded activation while the send command is
pending. The accepted send response is authoritative for the row and receipt;
overview is a separate, fallible projection. The page therefore owns the form
draft, its edit revision, invitations, overview and visible feedback. Transport
continues to own request construction and HTTP failure translation.

## Ordered implementation (3 steps)

1. **Model page transitions in `src/app.mjs`.** Keep editable drafts independent
   from command state and use a draft revision so a completion only clears the
   email field when the submitted draft was not changed. Preserve an active
   editable control and its selection across rendering. Completion check: a
   changed email remains focused after a pending send resolves, and a rejected
   send leaves an actionable error and draft.
2. **Separate send confirmation from overview synchronization.** Publish the
   invitation and confirmation as soon as `sendInvitation` resolves, then read
   the overview. An overview failure reports only its own unavailable state and
   leaves the row and confirmation visible. Completion check: a successful POST
   followed by a failed GET still shows the accepted address and a retryable
   overview error.
3. **Make local list movement continuous.** Reorder only the local array and
   restore focus by invitation id and action name after rendering. Completion
   check: moving an item changes DOM order without a POST, and pressing the same
   action again operates on that same item.

## Contracts and ownership

`sendInvitation(email)` and `readOverview()` are reused unchanged. `app.mjs`
adds `submitInvitation(event)` as the command owner and `refreshOverview()` as
the overview projection owner. `submitInvitation` snapshots `{email, revision}`
before awaiting; only a matching revision may clear the draft. It invokes
`refreshOverview` after confirmation without allowing its error to reclassify
the command as failed. `moveInvitation(id, offset, action)` owns local ordering
and focus restoration. Rendering is a projection of the owned state; it does
not make service calls.

The modest draft-revision seam makes a later autosave or richer form possible
without coupling a response to the current editor contents. A future server-side
ordering feature can replace `moveInvitation` at this single boundary while
keeping the row controls and focus behavior.

## Technical architecture

```text
Browser form/list controls
        | events
        v
src/app.mjs (drafts, feedback, rows, focus, render)
   | sendInvitation(email)       | readOverview()
   v                             v
src/transport.mjs ------------> platform API
   POST /api/invitations          GET /api/overview
```

## Data flow

```text
Email draft + revision
  -> submitInvitation snapshots input -> sendInvitation
  -> accepted invitation + receipt -> rows + success status (visible)
  -> readOverview -> overview count (visible)
                  \-> overview error alert; accepted row/status remain visible

Move action -> moveInvitation(id, offset) -> local rows reorder -> render
            -> focus matching [data-invite-id] action button
```

## Verification and evolution

`npm run check` exercises successful sending, local movement without a request,
and an overview refresh that preserves the note draft. Additional browser checks
cover the command/overview partial failure boundary, draft edits during a send,
and focus continuity after movement. The final symbol/caller cross-check covers
`submitInvitation`, `refreshOverview`, and `moveInvitation` in `app.mjs`.
