# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
Disabled fields are neither validated nor submitted. Unknown values are omitted.
Fields may also define a synchronous `enabledWhen(values)` predicate. It is
evaluated once per submission for each non-disabled field; a falsy result makes
the field inactive, so it is neither validated nor submitted. Conditions,
validators and payload construction share one top-level values snapshot captured
at submission start. Disabled fields do not evaluate their condition.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
and transport rejections. Preserve own keys such as `__proto__` and do not mutate
fields or values. The existing implementation satisfies these original contracts.
