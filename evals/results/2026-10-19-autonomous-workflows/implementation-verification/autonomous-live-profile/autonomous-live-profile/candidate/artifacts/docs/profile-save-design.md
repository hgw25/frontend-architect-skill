# Profile save and recovery design

## Outcome and established contracts

The profile form keeps its existing public API: `ProfileForm` receives a `Profile`,
and `updateProfile(displayName)` sends the existing `PATCH /api/profile` request.
Saving projects the submitted name immediately. Editing after a submission changes
only the draft. A failed current save removes that projection, exposes an accessible
retryable error, and shows the newest profile confirmed by a successful submission.

The response boundary accepts only an object with string `id` and `displayName`
members and a numeric `version`; non-2xx responses, malformed JSON, and invalid
bodies reject. Concurrent requests are allowed. Their client submission sequence,
not completion order, controls publication: a completion may confirm its own
submission only until a newer successful submission is confirmed, and only the
current submission may publish optimistic completion or failure feedback. This
preserves an older success as the rollback baseline while a newer save is pending,
without allowing a late older response to replace that newer save.

## Implementation sequence

The work has two dependency-ordered steps:

1. **Make the API response trustworthy.** `src/api.ts` owns HTTP and response-shape
   validation. `updateProfile` rejects unsuccessful HTTP responses and bodies that
   do not satisfy `Profile`. Completion check: focused API/form tests observe both
   invalid successful bodies and HTTP failures as failures.
2. **Own optimistic reconciliation in the form.** `src/ProfileForm.tsx` owns the
   draft, monotonically assigned submission identities, the newest confirmed
   submission, the current optimistic projection, and form feedback in one reducer.
   Completion check: controlled concurrent requests demonstrate immediate display,
   draft independence, stale-completion suppression, newest-confirmed rollback,
   accessible failure, and a subsequent retry.

No shared request framework or form library is warranted: this repository has one
mutation owner, and the product-specific acknowledgement rule is clearer at that
owner. The reducer is justified by the atomic relationship among confirmation,
projection, and error transitions; request execution remains in the submit event.

## Code contracts and ownership

- `updateProfile(displayName: string): Promise<Profile>` performs transport and
  decoding. It either resolves with a validated profile or rejects; it never
  returns an invalid value or converts a failure into success.
- `ProfileForm` assigns each submitted draft a strictly increasing local ID and
  calls `updateProfile` with that immutable snapshot.
- The form reducer receives `submit`, `saveSucceeded`, and `saveFailed` events.
  `confirmedSubmissionId` prevents an older success from superseding a newer
  confirmed save. `optimistic` is either the current submitted name and ID or
  absent; the visible name is derived as `optimistic.name ?? confirmed.displayName`.
  Only a completion matching the latest submitted ID changes current feedback.
- The controlled input remains the retry source after failure. The native form and
  button retain keyboard submission semantics; failure feedback uses `role="alert"`.

## Technical architecture

```text
[User / native form]
        |
        | edit + submit
        v
[ProfileForm]
  draft + submission ID owner
  reconciliation reducer
        |
        | updateProfile(name snapshot)
        v
[src/api.ts transport boundary]
  PATCH + status/body validation
        |
        v
[HTTP /api/profile]
```

Dependencies point from the form to the narrow API boundary. Network knowledge
does not enter the reducer, and optimistic publication policy does not enter the
transport helper.

## Data flow and failure branches

```text
input edit -> ProfileForm draft
submit N   -> reducer submit(N, draft snapshot) -> optimistic name is rendered
           -> updateProfile(snapshot) -> PATCH /api/profile

valid success(N, profile)
  -> reducer advances confirmed only when N is newer than its confirmed ID
  -> if N is current: clear optimistic/error and render confirmed profile
  -> if N is stale: keep the newer optimistic/confirmed display unchanged

HTTP / parse / shape failure(N)
  -> if N is current: clear optimistic, render newest confirmed profile,
     announce retryable alert; retain draft for the next submit
  -> if N is stale: do not disturb current display or feedback
```

## Verification and evolution

`npm run check` is the decisive repository check once dependencies are available.
Tests use controllable promises rather than timing sleeps and assert consumer-visible
results. In addition to the supplied cases, coverage should include non-2xx failure,
stale failure suppression, late older success after a newer success, draft edits not
changing the projection, and retry clearing the error.

A realistic next change is adding another editable profile field. The transport
validator can expand the `Profile` contract, while the reducer's submitted snapshot
can become a small payload object without changing acknowledgement ordering or
error ownership. A field-specific server error would require an explicit typed API
contract; the current generic transport failure intentionally remains form-level.

The initial 2026-10-19 baseline attempt was blocked because dependencies were not
installed (`tsc: command not found`). After installing the locked dependencies,
the final `npm run check` passed: TypeScript emitted no errors and both test files
passed (7 tests), including the supplied acceptance cases and added race/retry
coverage.
