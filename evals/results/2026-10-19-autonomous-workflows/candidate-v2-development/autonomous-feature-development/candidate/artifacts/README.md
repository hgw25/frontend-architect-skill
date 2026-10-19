# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
Disabled fields are neither validated nor submitted. Unknown values are omitted.
Fields may also define a synchronous `enabledWhen(values)` predicate. It runs once
per submission for each non-disabled field; a falsy result makes the field inactive,
so it is neither validated nor submitted. Conditions, validators and payload
construction share a shallow snapshot of the values captured when submission starts.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator,
condition, and transport failures. Preserve own keys such as `__proto__` and do not
mutate fields or values. The design is recorded in
[`docs/conditional-fields.md`](docs/conditional-fields.md).
