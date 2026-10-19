# Conditional field submission design

## Requirement and contract

`processForm(fields, values, send)` supports fields whose participation depends on
the values captured when a submission starts. A field may provide the synchronous
predicate `enabledWhen(valuesSnapshot)`. A non-disabled field is active when it has
no predicate or its predicate returns a truthy value.

Active fields retain the existing required/custom-validation and payload rules.
Inactive fields are neither validated nor submitted. Static `disabled` takes
precedence and prevents the predicate from running. Each applicable predicate runs
exactly once per submission. Predicate errors, like validator and transport errors,
propagate to the caller. The function does not mutate the caller's fields or values.

All decisions in one submission use one shallow, top-level snapshot of `values`.
This keeps eligibility, validation, and the payload internally consistent if the
caller changes the original values while asynchronous validation is pending. A
shallow snapshot matches the form's top-level field-name contract; nested value
objects retain their existing identities.

## Implementation sequence

There are two dependency-ordered increments:

1. In `src/process-form.js`, capture the values snapshot and derive the active field
   set by applying `disabled` and `enabledWhen`. Reuse that set and snapshot for
   required checks, custom validators, and payload construction. Complete when
   inactive predicates/validators cannot affect submission, predicates run once,
   and mid-flight changes to the original values do not change the result.
2. Expose the conditional field contract in `README.md` and run the complete Node
   test suite. Complete when original form behavior and conditional branches pass
   together, including errors and prototype-like field names.

## Code contracts and ownership

- `processForm(fields, values, send): Promise<unknown>` remains the sole public
  operation and owns the submission snapshot, field eligibility, validation order,
  error collection, and the single transport call.
- A field's optional `enabledWhen(valuesSnapshot): boolean` owns only its domain
  condition. It is called by `processForm` after the static disabled check and
  before validation.
- Existing `validate(value, valuesSnapshot)` callbacks and `send(payload)` retain
  their contracts. `send` is called once only when all active fields validate.

## Technical architecture

```text
Caller
  | fields, current values, send
  v
processForm                         Field callbacks
  |-- owns top-level snapshot --------> enabledWhen(snapshot)
  |-- owns active-field set ----------> validate(value, snapshot)
  |-- owns errors/payload
  `-----------------------------------> send(payload)
                                           |
                                           v
                                      transport result
```

Callbacks are dependencies supplied by the caller. They cannot access the later
transport step except through the values and result contracts above.

## Data flow

```text
fields + values
  -> copy values -> valuesSnapshot
  -> for each field
       disabled? ---- yes -> inactive (predicate is not called)
       enabledWhen? - yes -> call once -> falsy -> inactive
                              |
                            truthy
                              v
                            active
  -> validate each active field against valuesSnapshot
       | error text -> collect -> return { errors }
       | thrown/rejected error ----------> reject unchanged
       v
     no errors
  -> build payload from active names + valuesSnapshot
  -> send(payload) -> return/await its result
       `-- thrown/rejected transport error -> reject unchanged
```

## Verification and evolution

The repository's original tests cover required values, custom validation, mutation
safety, transport behavior, and special property names. Conditional tests cover
inactive and active branches, once-per-submission evaluation, disabled precedence,
snapshot consistency, propagated failures, and special names. `npm run check` is
the decisive combined check. Both increments are implemented; on 2026-10-19 that
command passed all 13 tests under Node's test runner.

A realistic follow-up is adding another predicate based on multiple fields. It only
adds a field-local `enabledWhen` function; the submission pipeline and callback
contract do not change. Asynchronous conditions would be a different lifecycle
contract and should be designed explicitly rather than being accepted accidentally.
