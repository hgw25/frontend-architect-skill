# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

The conditional-field design and its maintained implementation contract are in
[`docs/conditional-fields.md`](docs/conditional-fields.md).

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
They may also define a synchronous `enabledWhen(values)` predicate. Disabled fields
are neither condition-checked, validated nor submitted. A non-disabled field whose
predicate is falsy is likewise neither validated nor submitted. Conditions are
evaluated once per submission. Conditions, validators and payload construction use
the same shallow top-level values snapshot. Unknown values are omitted.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
and transport rejections. Preserve own keys such as `__proto__` and do not mutate
fields or values. The existing implementation satisfies these original contracts.
