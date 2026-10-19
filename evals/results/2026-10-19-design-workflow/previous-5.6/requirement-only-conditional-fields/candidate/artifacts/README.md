# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
Disabled fields are neither validated nor submitted. Unknown values are omitted.
Fields may also define a synchronous `enabledWhen(values)` condition. A conditional
field participates in required checks, custom validation, and submission only when
the condition returns `true`; disabled fields take precedence and do not evaluate
their condition. Each submission uses one shallow top-level values snapshot for
all conditions, validators, and the final payload.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
and transport rejections. Preserve own keys such as `__proto__` and do not mutate
fields or values. The existing implementation satisfies these original contracts.
