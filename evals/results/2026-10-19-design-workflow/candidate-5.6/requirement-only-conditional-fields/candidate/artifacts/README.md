# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Conditional-field behavior and its submission snapshot are documented in
[`docs/conditional-fields-design.md`](docs/conditional-fields-design.md).

Fields have unique string names, optional boolean disabled/required, an optional
synchronous `enabledWhen(values)` condition, and an optional sync or async
`validate(value, values)` returning a string error or undefined. Disabled fields are
neither conditionally evaluated, validated, nor submitted. A conditional field is
validated and submitted only when its condition returns `true`. Unknown values are omitted.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator
and transport rejections. Preserve own keys such as `__proto__` and do not mutate
fields or values. Conditions, validators, and payload construction share one shallow
value snapshot captured at the start of each submission.
