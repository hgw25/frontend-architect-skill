# Schema-driven form submission

This is an existing frontend form submission capability. Its public async API is
`processForm(fields, values, send)`. Run `npm run check`; no dependencies are needed.

Fields have unique string names, optional boolean disabled/required and an optional
sync or async `validate(value, values)` returning a string error or undefined.
Disabled fields are neither validated nor submitted. Unknown values are omitted.
An optional synchronous `enabledWhen(values)` predicate makes a non-disabled field
eligible for that submission when it returns a truthy value. Conditions and
validators observe the same shallow top-level snapshot captured at submission start.
Required emptiness is undefined, null or the empty string; zero, false, whitespace
and empty arrays are valid. Required errors are `Required` and skip that field's
custom validator. Custom errors retain their text. Await validation before sending
once; return `{ errors }` without sending on validation failure. Propagate validator,
condition, and transport failures. Preserve own keys such as `__proto__` and do not
mutate fields or values.
