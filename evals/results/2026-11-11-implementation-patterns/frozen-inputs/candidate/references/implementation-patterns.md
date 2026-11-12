# From Engineering Decisions to Working Code

Use a relevant section when a chosen principle still leaves the execution
mechanism unclear. These examples connect rules, owners, code and consumers;
they are not a new application architecture. Reuse the project's form, query,
mutation and lifecycle facilities when they already supply the required behavior.
The examples use dependency-free JavaScript so their mechanics can be executed
without selecting a frontend framework; preserve the target project's types and
conventions when applying them.

## Contents

- [Make the decision concrete](#make-the-decision-concrete)
- [Use one field set across processing paths](#use-one-field-set-across-processing-paths)
- [Implement current-request publication](#implement-current-request-publication)
- [Preserve confirmation through secondary failure](#preserve-confirmation-through-secondary-failure)

## Make the decision concrete

Work from the actual entry point and a representative input through the final
consumer. For a consequential decision, resolve the mechanism the next engineer
would otherwise have to invent:

| Selected idea | Concrete implementation question | Evidence of application |
| --- | --- | --- |
| Reuse and information hiding | Which existing capability owns the policy, and which input/result keeps its details out of callers? | A real caller uses that contract; a response-format change stays at the owning adapter |
| Functional core and imperative shell | Which calculation can return a decision before I/O, and where is that decision consumed? | The orchestration calls the rule before sending; rejected input produces no write |
| Minimal state and atomic transitions | Which facts are stored, which are derived, and what complete state does each event produce? | A transition publishes a coherent phase; independent flags cannot contradict it |
| Async ownership and lifecycle | What establishes identity, where is completion admitted, and what invalidates it? | Old success and failure cannot publish; teardown blocks later work |
| Actionable errors | Where is the effect confirmed, and what can be retried afterwards? | A secondary failure preserves the receipt and retries only its own operation |

For unresolved behavior, sketch the main path, state transition or algorithm
beside its important contract in the existing design; for a local edit, work
directly at the established owner. Include the meaningful failure/interruption
branch. A promise to "use a reducer" or "separate concerns" leaves the mechanism
undecided. A reducer needs events and transitions; an adapter needs an actual
mapping and caller; a lifecycle needs acquisition and cleanup wiring.

Implement one complete path through its caller before multiplying variants.
Inspect the resulting code: can you locate the guard/transition/cleanup that
enforces the rule, and does the consumer use it? Run a check that would fail if
that mechanism were omitted. If it fails, revise the responsible implementation
and design together. Do not add a second checklist, universal abstraction or
separate approval step. Use one realistic later change to check the boundary,
without implementing that future feature.

The following examples cover common rule and lifecycle decisions. For other
domains, apply the same translation at the relevant owner: source-to-sink checks
for trust boundaries, parser/serializer and navigation handlers for URL state,
or a measured runtime trace for rendering costs. These examples do not replace
those topics' contracts or runtime verification.

## Use one field set across processing paths

**Contract.** Disabled fields do not validate, enter the payload or block
submission. Required means non-nullish and non-empty string; `0` and `false`
are valid. Validators may return a specific message asynchronously; unexpected
validator or transport errors reject. This example has flat scalar draft values
and stable field definitions during a submission.

**Failure mechanism.** Filtering disabled fields in required validation and
payload construction while running custom validation over all fields lets an
irrelevant validator block the command. Moving those loops into separate files
does not repair the inconsistency.

**Implementation.** Read [form-submission.mjs](implementation-examples/form-submission.mjs).
`submissionFields(fields)` owns participation. `submitForm(fields, values, send)`
selects once, snapshots the values before the first `await`, validates that set,
then constructs the payload from the same set and snapshot. Expected field
rejections return `{kind: 'invalid', errors}`; sending returns
`{kind: 'sent', receipt}`. No write occurs when validation rejects.

An event handler consumes the outcome explicitly:

```js
const outcome = await submitForm(fieldDefinitions, draft, api.save);
if (outcome.kind === 'invalid') {
  showFieldErrors(outcome.errors);
} else {
  showReceipt(outcome.receipt);
}
```

Here `api.save`, `showFieldErrors` and `showReceipt` stand for the application's
existing transport and presentation boundaries. Its event owner handles an
unexpected rejection with the project's error convention. Keep disabled fields
in the draft if the product requires restoration; participation does not determine
visibility. A read-only field may still participate. Let an existing form library
own the rule instead when it already guarantees this behavior.

**Decisive checks.** A disabled required field whose validator would reject never
runs that validator and never enters the sent payload; the active fields still
send. Zero and false pass required validation. An edit while validation is pending
does not change what this submission sends. Specific validation messages survive,
and unexpected failures remain observable. The
[executable tests](implementation-examples/implementation-examples.test.mjs)
exercise these through the public operation.

**Change probe and limit.** If participation later depends on another field,
change the owned selection rule and its inputs, then check every processing path.
Do not build a configurable rule engine in anticipation. Nested mutable values,
server validation and re-enabling fields during pending work need their actual
project contracts; the flat snapshot here does not settle those requirements.

## Implement current-request publication

**Contract.** Only the latest started search can publish loading, success or
failure. Even repeated identical queries are distinct requests. Disposing the
screen owner invalidates pending completions and prevents new work. The injected
loader returns normalized items and need not support transport cancellation.
This example replaces old results while loading.

**Failure mechanism.** Comparing query text confuses two requests for the same
query. Guarding only successful results still lets an old rejection replace the
new state. An unconditional `finally` can end the new request's loading phase.

**Implementation.** Read [latest-search.mjs](implementation-examples/latest-search.mjs).
`createLatestSearch(load, publish)` creates one owner. `submit(query)` allocates
an identity before starting work; success and failure share the same admission
condition. Loading/success/error are complete state variants, so there is no
independent loading flag to clear in `finally`. `dispose()` invalidates the
owner. The loader owns transport and normalization; publication owns presentation.
Its synchronous callback must not throw; a rendering bug is not a network failure.

For a plain DOM form containing an input named `query`, lifecycle wiring can be:

```js
const search = createLatestSearch(userApi.search, renderSearch);
function onSubmit(event) {
  event.preventDefault();
  const query = String(new FormData(form).get('query') ?? '').trim();
  void search.submit(query);
}
form.addEventListener('submit', onSubmit);

function cleanup() {
  form.removeEventListener('submit', onSubmit);
  search.dispose();
}
```

`form`, `userApi.search` and `renderSearch` are host-provided bindings; invoke
`cleanup` from the owner's real teardown. In a framework, create the owner at its
stable setup/lifecycle boundary, remove handlers/subscriptions on cleanup, and
use its existing state renderer. Do not recreate it for every input or render.
If the query layer already handles identity, errors and unmounting, configure
and verify that layer instead of copying this counter beside its cache.

**Decisive checks.** Use controllable promises: B succeeds then A fails; A succeeds
or fails while B is pending; two identical queries complete out of order; dispose
then complete or submit. Observe published states and loader calls, without
inspecting the private generation. The executable tests cover these orders.

**Change probe and limit.** Adding an HTTP response field belongs in the loader's
adapter, not this owner or renderer. Adding ordered saves calls for a different
policy, not reuse of latest-wins. Preserving stale results requires their query
identity; retry and editable drafts need the
[submitted-input contract](async-and-lifecycles.md#separate-execution-from-publication).
These unit checks establish publication semantics. Actual form behavior,
framework remounting and visible feedback still need the project's runtime checks.

## Preserve confirmation through secondary failure

**Contract.** The invitation service resolves with an authoritative receipt;
refreshing the member list is separate fallible work. A rejected command remains
rejected. After confirmation, refresh failure must leave the invitation visible
as sent and offer refresh recovery without sending another invitation.

**Failure mechanism.** One `try/catch` around send and refresh labels both failures
as "invitation failed". Retrying that handler can repeat an already committed
effect. A private `sent` flag also fails if the error renderer cannot display it.

**Implementation.** Read [confirmed-invitation.mjs](implementation-examples/confirmed-invitation.mjs).
`inviteMember(email, {sendInvite, reloadMembers})` awaits the write outside the
refresh catch. Both returned variants carry the receipt; only the degraded
variant carries a refresh error. Write rejection propagates to the command's
existing error owner. A settled feedback component can consume either variant:

```tsx
function InvitationFeedback({ result, retryRefresh }) {
  return (
    <>
      <p role="status">Invitation {result.receipt.id} sent.</p>
      {result.kind === 'confirmed-refresh-failed' && (
        <div>
          <p>The member list could not refresh.</p>
          <button onClick={retryRefresh}>Retry member list</button>
        </div>
      )}
    </>
  );
}
```

This JSX illustrates the settled consumer contract, not a complete typed screen.
The real event/mutation owner stores the returned outcome and supplies a
`retryRefresh` that calls the existing read operation; it never calls
`inviteMember` again for refresh recovery. Render confirmation without requiring
the list data. Reuse the application's mutation/query state, localization and
feedback components; native form actions or redirects must carry the receipt
through their final destination too.

**Decisive checks.** Confirm send, reject refresh and inspect the receipt and
refresh-specific outcome; verify one write. Reject send and verify no refresh or
fabricated confirmation. A full success returns both receipt and list. These
branches run in the executable tests. In the application, additionally exercise
send-success/refresh-failure through each actual final consumer, then activate
refresh recovery and verify no second write. The example tests do not prove that
an application's renderer or redirect preserves this outcome.

**Change probe and limit.** Replacing the refreshed list with navigation should
change the secondary owner while preserving authoritative confirmation. A write
timeout with unknown outcome is not a confirmed receipt: use the service's
reconciliation/idempotency contract. This example does not invent server atomicity
or duplicate-write protection.

Run the examples from the installed skill or repository root:

```sh
node --test references/implementation-examples/implementation-examples.test.mjs
```

The repository's existing `python3 -m unittest discover -s scripts -p 'test_*.py'`
also runs them. No framework, dependency installation or network access is needed.
