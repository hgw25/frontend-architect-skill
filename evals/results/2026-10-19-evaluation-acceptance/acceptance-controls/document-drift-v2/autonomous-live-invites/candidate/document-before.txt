# Team invitation interactions

## Requirement and facts

The page sends one invitation for each submitted email, shows the accepted
invitation in the local list, and reports a receipt to assistive technology.
The existing `sendInvitation(email)` transport resolves only after the service
has accepted the request. `readOverview()` is a separate, fallible projection:
its failure must not turn an accepted invitation into a failed send. Existing
rows are already loaded in `src/data.mjs`; moving them is a local display-only
operation and must never call the transport.

The page must preserve a Team note and user edits made while the send is pending.
Repeated activation of Send while a command is pending does nothing. After a
keyboard list move, focus remains on the corresponding Move earlier/later
button in its new row.

## Delivery sequence

1. **Separate page state and rendering in `src/app.mjs`.** Keep editable email
   and note, local rows, the active send, its confirmation/error, and overview
   feedback as distinct state. Capture an email revision at submission so only
   the unchanged submitted draft is cleared. Check: typing during a controlled
   send survives its completion.
2. **Implement the send/overview flow in `src/app.mjs`.** Disable only the
   duplicate send control, append the accepted invitation exactly once, publish
   its receipt, then independently refresh overview. An overview error is shown
   as an overview error while the accepted receipt remains visible. Check:
   success plus failed overview still presents both facts.
3. **Implement local reordering and interaction continuity in `src/app.mjs`.**
   Move only adjacent rows in the local array and restore the triggering
   control after the render. Check: keyboard activation can be repeated without
   manually finding the moved row, and no invitation request is issued.
4. **Cover meaningful browser outcomes in a new focused Playwright spec and
   run the repository check.** Completed: partial overview failure, draft/note
   preservation, and keyboard reordering are covered in
   `tests/invites-interactions.spec.mjs`; the existing suite covers the normal
   send, local-only reordering, and manual overview refresh. `npm run check`
   passed with seven browser tests.

## Contracts and ownership

| Owner | Contract | State/effects |
| --- | --- | --- |
| `src/app.mjs` `submitInvitation(event)` | Native form submit -> calls `sendInvitation(submittedEmail)` once while no send is active; receives `{ invitation, receipt }`. | Owns send lifecycle and accepted receipt. Clears `email` only when its edit revision still equals the submission revision. |
| `src/app.mjs` `refreshOverview()` | Calls `readOverview()` and replaces overview only on success. | Owns overview pending/error state; its failure does not modify send feedback. |
| `src/app.mjs` `moveInvitation(id, delta, focusButton)` | Reorders an existing adjacent row locally. | Owns the rows array and targeted post-render focus restoration. No service call. |
| `src/transport.mjs` | Existing narrow HTTP boundary. | Remains the owner of request encoding and HTTP-status rejection. |

The page remains a small single-module native ESM feature because the state and
DOM lifecycle are tightly coupled and it has one consumer. The state object
keeps independent workflow facts separate rather than introducing a generic
request abstraction. A likely next change is server-backed reordering; its
boundary is localized to `moveInvitation`, so the current local behavior can be
replaced without changing send or overview ownership.

## Technical architecture

```text
Browser form/list controls
  | input, submit, click/keyboard
  v
src/app.mjs page owner
  |-- submitInvitation(email) ----> transport.sendInvitation() ---> POST /api/invitations
  |-- refreshOverview() ----------> transport.readOverview() -----> GET /api/overview
  |-- moveInvitation(id, delta) --> local rows only
  v
rendered semantic form, status/alert, overview, invitation list
```

## Data flow

```text
Email draft + revision
  -> submitInvitation snapshots {email, revision}
  -> POST accepted -> {invitation, receipt}
  -> append invitation + publish "sent" receipt
  -> GET overview -> overview display
                 \-> failure -> overview error only; send receipt stays visible

Move button {id, delta, button name}
  -> moveInvitation -> reordered local rows -> render -> focus same button
```

## Verification and evolution

Executed browser checks cover the normal send, service rejection/retry, accepted
send followed by overview failure, draft and note continuity, local reorder
without a POST, and keyboard focus after a move. The implementation retains the
existing public labels, `data-invite-id`, overview test id, and native controls
so current consumers remain compatible.
