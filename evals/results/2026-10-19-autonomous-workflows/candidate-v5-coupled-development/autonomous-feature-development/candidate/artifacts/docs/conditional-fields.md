# Conditional field submission design

## Requirement and established contracts

`processForm(fields, values, send)` must support an optional synchronous
`enabledWhen(values)` predicate on a field. On each submission, an enabled field
is one that is neither statically disabled nor rejected by its predicate. Inactive
fields are not validated and do not appear in the submitted payload. Static
`disabled` takes precedence, so its predicate is not called.

All predicates and validators receive one shallow top-level snapshot of `values`,
and the payload is built from that snapshot. This prevents caller mutations during
awaited validation from changing a submission already in progress. Every applicable
predicate is evaluated exactly once per submission. Predicate, validator, and
transport exceptions retain the existing rejection behavior and identity. Existing
required-value rules and support for own keys such as `__proto__` remain unchanged.

The field list and values remain caller-owned and are never mutated. The existing
README and tests are the authoritative public contract; no dependency, migration,
or recovery mechanism is required.

## Functional sequence

The feature has two dependency-ordered implementation steps:

1. **Capture and select (completed).** In `src/process-form.js`, copy the submission's own
   enumerable values once, then select eligible fields in field order. Skip disabled
   fields before evaluating `enabledWhen(snapshot)`. Completion check: inactive and
   disabled fields invoke neither conditional nor validation work, and each active
   predicate runs once per call.
2. **Validate and submit the selected snapshot (completed).** Reuse the selected field list for
   both existing validation and payload creation, reading values only from the
   snapshot. Completion check: mid-validation caller mutation cannot affect later
   validators or transport data; validation failures still block `send`, while
   callback rejections propagate.

## Code contracts and ownership

- `processForm(fields, values, send): Promise<unknown | { errors: object }>` remains
  the sole public operation and owns snapshot lifetime, eligibility, ordered
  validation, payload construction, and the single transport call.
- `field.enabledWhen(snapshot): boolean` is optional and synchronous. It owns only
  the domain decision for that field; `processForm` owns when it may run.
- `field.validate(value, snapshot)` retains its sync-or-async contract and sees the
  same snapshot as all predicates and the payload builder.
- `send(payload)` retains its existing return and rejection semantics.

No helper abstraction is introduced: eligibility is local to the one operation,
and splitting it out would hide the important disabled-before-condition order.

## Technical architecture

```text
Caller
  | fields, mutable values, send
  v
processForm (src/process-form.js)
  |-- owns --> shallow submission snapshot
  |-- calls -> field.enabledWhen(snapshot) [eligible non-disabled fields only]
  |-- calls -> field.validate(snapshot[field.name], snapshot) [eligible fields]
  |-- builds -> payload from eligible fields + snapshot
  `-- calls -> send(payload) exactly once when valid
                    |
                    v
              Transport / caller effect
```

## Data flow

```text
fields + values
  -> copy values -> submission snapshot
  -> for each field: disabled? --yes--> omit
                     |
                     no
                     v
                enabledWhen? --false--> omit
                     |
                  true/absent
                     v
                eligible field list
  -> required/custom validation against snapshot
       | error(s) -> return { errors }; do not call send
       | thrown/rejected callback -> reject with original error
       v
  payload entries read from snapshot
  -> send(payload)
       | resolved -> return transport result
       ` rejected -> reject with original error
```

## Verification and evolution

`npm run check` covers original behavior plus inactive, active, disabled-precedence,
per-submission recalculation, snapshot consistency, callback failure, and
prototype-like key cases. It passed all 13 tests on 2026-10-19 after implementation;
`git diff --check` also passed. A realistic follow-up is a second condition based on
another field; it requires only another `enabledWhen` predicate because all
conditions already observe the complete submission snapshot. Async predicates are
outside the current contract and can later be introduced at the eligibility phase
without changing validation or transport ownership.
