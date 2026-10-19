# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
Fields may also define a synchronous `enabledWhen(values)` predicate. It is
evaluated once per submission unless the field is disabled; false makes the field
inactive. Disabled and inactive fields are neither validated nor submitted. All
conditions, validators and the payload use one shallow snapshot of the submitted
values. Unknown values are omitted.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
and transport rejections. Preserve own keys such as `__proto__` and do not mutate
fields or values. The existing implementation satisfies these original contracts.

See [the conditional-field design](docs/conditional-fields.md) for the submission
flow and ownership boundaries.
