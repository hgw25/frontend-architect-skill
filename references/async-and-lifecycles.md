# Async Operations and Lifecycles

Use when request ordering, mutations, optimistic state, retries, subscriptions,
or owned resources are a real source of complexity. Use the project's existing
data layer or framework lifecycle when it already provides the required policy;
this reference is not a request to write a generic request engine.

## Choose policy from the operation

First establish what concurrent operations mean to the user and the server.

| Meaning | Suitable starting policy | What it does not guarantee |
| --- | --- | --- |
| Only the newest search or preview matters | Publish only the current request's result; optionally abort superseded work | Aborting does not prove the server stopped, and some clients ignore cancellation |
| Every local edit must be saved in order | Serialize writes or use server versions/conflict handling | A local queue does not order other tabs or devices |
| Repeated activation while pending should do nothing | Disable/guard the local command; server idempotency for duplicate effects | A disabled button alone does not prevent retries or multiple clients |
| Identical reads can share work | Existing cache/deduplication keyed by complete identity | Deduplication is not freshness, authorization or invalidation |
| Independent reads improve latency | Bounded parallel work and an explicit partial-failure policy | Promise aggregation does not make results atomic |
| A write timed out with unknown outcome | Reconcile with the authoritative source or retry with a supported stable idempotency key | Timeout is not proof of failure and unsafe writes must not be blindly repeated |

Do not apply latest-wins cancellation to an ordered save queue, or serialize all
searches when only the latest result matters. Debouncing reduces frequency; it
does not establish any of these correctness guarantees.

## Separate execution from publication

For a latest-result operation, the owner needs a stable input snapshot, a request
identity and a condition for publishing completion. Check that condition for
success, failure, and cleanup that changes visible state. An old `finally`
clearing `loading` can be wrong even if old success results are ignored.

Reason through a concrete timeline before implementing:

```text
submit A -> submit B -> B succeeds -> A fails
expected: B remains visible, A's error and cleanup do not replace B's state
```

Also cover A completing while B is still pending. Cancellation may save work;
identity/version checking determines whether completion is still relevant.
Use the data layer's query key and lifecycle if it already expresses this.
Do not add a parallel request counter, local loading flag and cache behind it.

An operation's identity can include resource, user/tenant, query and generation.
A response for the old account or route must not become current merely because
its promise resolves last. Define what dispose, navigation, replacement and
resubmission do to pending completion. A retry normally uses the failed submitted
input; editing a draft does not silently change the meaning of retry.

## Keep errors actionable and owned

Catch at the layer that can recover, translate an external error into its public
contract, or present it. Do not catch in every helper, duplicate notifications,
or convert failure into an empty successful value. Expected validation or domain
rejection can be a typed result; unexpected transport/runtime failure can remain
an exception according to the project's convention. Do not introduce Result
wrappers throughout the project for one operation.

Keep enough context to identify the failed operation and recovery action without
leaking sensitive payloads. Differentiate cancellation caused by supersession
from a current user-visible failure. If recovery is impossible locally, retain
an honest error or unknown-result state rather than promising that retry is safe.

## Reconcile optimistic state with acknowledgements

Keep these meanings distinct when optimistic behavior exists:

- the last server-confirmed value/version;
- pending user intent and its operation identity;
- the projection currently shown to the user.

If save A is confirmed while save B is pending and B then fails, rollback must
reflect the newest valid acknowledgement, not an old closure snapshot. Define
whether server responses can be ordered by version; client request order alone
does not establish server commit order. When the contract cannot support safe
optimism, use pending feedback and authoritative refresh instead.

Rollback is a new decision against current state, not unconditional restoration
of everything captured before `await`. It must not undo another successful edit,
a later navigation, or changes to unrelated fields. Put related state changes
in one owned transition rather than updating competing stores independently.

## Own acquisition, replacement and release

A resource owner has one lifecycle from acquisition to release. Establish:

- who acquires, publishes and disposes it;
- what happens if acquisition fails partway through;
- how replacement invalidates the previous instance and pending callbacks;
- which cleanup operations are safe to repeat;
- whether a consumer is borrowing a shared resource or owns it exclusively.

A disposer returned by a subscription should remove that registration only.
Cleanup from an old component must not destroy a replacement owned by another
mount. Do not close a shared connection whenever one subscriber disappears.
Use framework cleanup where possible; choose a class/closure only if it makes
resource identity and lifecycle clearer than the existing owner.

## Verify the policy, not the machinery

Use controllable promises, clocks or transport boundaries to create meaningful
orders without arbitrary sleeps. Assert visible state and public side effects:
newer results survive old success/error/cleanup; ordered commands reach the
transport in the required order; an unknown write outcome is reconciled; disposal
prevents stale publication and releases only owned resources.

Use a real browser/device when the claim concerns navigation, native resources,
DOM interaction or layout. Unit-level race checks establish operation semantics,
not successful rendering or actual device cleanup. Keep production APIs narrow;
do not expose private counters or controllers merely to simplify a test.
