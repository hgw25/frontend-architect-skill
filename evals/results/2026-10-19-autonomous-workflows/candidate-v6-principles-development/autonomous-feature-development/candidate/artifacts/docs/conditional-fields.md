# Conditional field submission design

## Outcome and established contracts

`processForm(fields, values, send)` supports an optional synchronous
`enabledWhen(values)` predicate on each field. A field participates in validation
and submission only when it is not statically disabled and its predicate is absent
or returns a truthy value.

The existing required, custom-validation, error, payload, and rejection behavior
remains authoritative. In particular, disabled fields take precedence and never
invoke `enabledWhen`; an inactive field cannot validate, block, or appear in the
payload; predicate failures propagate unchanged; and own field names such as
`__proto__` remain ordinary data keys.

One shallow snapshot of the top-level submitted values is owned by each
`processForm` call. Conditions, validators, and payload construction all consume
that same snapshot, so caller mutations while asynchronous validation is pending
cannot change the in-flight submission. Nested values intentionally retain their
identity: this is a top-level consistency boundary, not deep cloning or input
serialization. The function continues not to mutate fields or caller values.

## Ordered implementation

The feature has two dependency-ordered steps:

1. **Establish submission eligibility and snapshot consistency.** In
   `src/process-form.js`, create the submission snapshot before eligibility is
   evaluated, then select fields with the static-disabled check before the optional
   predicate. Pass the snapshot through required/custom validation and payload
   construction. Completion check: conditional tests demonstrate inactive,
   recalculated, disabled-precedence, stable-snapshot, failure, and prototype-key
   behavior.
2. **Publish and verify the complete contract.** Update the public README contract
   and execute the full Node test suite so both original and conditional behavior
   run together. Completion check: `npm run check` passes without changing the
   evaluation harness.

## Supporting contracts and ownership

- `processForm(fields, values, send): Promise<unknown | { errors: object }>` remains
  the sole public operation and owns the complete per-submission lifecycle.
- `field.enabledWhen?: (snapshot) => unknown` is a synchronous eligibility rule.
  It is invoked exactly once per non-disabled field per submission. Its return is
  interpreted by JavaScript truthiness; thrown errors are not caught.
- The local `snapshot` is a shallow copy containing the caller's own enumerable
  values. It is the only value object exposed to predicates and validators and the
  source for the submitted payload.
- `send(payload)` remains the only effect. It runs exactly once after successful
  validation; its result or rejection is returned unchanged.

The implementation stays in the existing module because eligibility, validation,
and payload selection are phases of one small submission operation, with no
separate identity or reusable lifecycle that would justify another abstraction.

## Technical architecture

```text
Caller
  | fields, values, send
  v
processForm (submission lifecycle owner)
  |-- shallow snapshot ------------------------------+
  |-- eligibility: disabled -> enabledWhen(snapshot) |
  |-- required/custom validation(snapshot)           |
  |-- errors ---------------------------------------> Caller
  `-- payload from eligible fields + snapshot
        |
        v
      send(payload) --------------------------------> Caller (result/rejection)
```

## Data flow

```text
values --shallow copy--> snapshot
fields + snapshot --disabled first / enabledWhen once--> eligible fields
eligible fields + snapshot --required then validate--> errors
  | errors present: return { errors }; do not call send
  ` no errors: eligible names --lookup in snapshot--> payload
                 payload --send once--> returned transport result

enabledWhen throws -------------------------------> same rejection to caller
validate/send rejects ----------------------------> same rejection to caller
caller mutates values after invocation -----------> no change to snapshot/payload
```

## Verification and evolution

The full suite is the decisive consumer-level check because it observes validation,
payload, transport calls, mutation timing, and rejection identity. The baseline had
8 passing checks (the 7 original-contract tests plus disabled precedence) and 5
expected conditional-feature failures.
After implementation, `npm run check` passes all 13 tests: the 6 conditional tests
and 7 original-contract regression tests.

A realistic follow-up is adding more condition operators in schema creation. The
callback seam already supports those rules without changing the submission
lifecycle. If asynchronous conditions are later required, their ordering and
rejection semantics should be designed explicitly rather than treating a returned
Promise as truthy under today's synchronous contract.
