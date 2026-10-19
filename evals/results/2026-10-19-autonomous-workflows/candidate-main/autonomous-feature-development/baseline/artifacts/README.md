# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
They may also define a sync or async `enabledWhen(values)` condition. A condition
is evaluated once per submission; a falsey result makes that field inactive.
Disabled and inactive fields are neither validated nor submitted, and `disabled`
fields do not evaluate their condition. Unknown values are omitted.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
condition and transport rejections. Conditions, validators and the payload use the
same top-level values snapshot captured when submission starts. Preserve own keys
such as `__proto__` and do not mutate fields or values.
