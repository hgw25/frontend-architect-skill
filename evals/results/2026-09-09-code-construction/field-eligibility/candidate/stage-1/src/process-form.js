/** Submit a schema-driven form. See README.md for the public contract. */
export async function processForm(fields, values, send) {
  const errors = [];
  const payload = [];

  for (const field of fields) {
    if (field.disabled) continue;

    // An absent name must not resolve to an inherited property such as __proto__.
    const value = Object.hasOwn(values, field.name) ? values[field.name] : undefined;
    payload.push([field.name, value]);

    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push([field.name, 'Required']);
      continue;
    }

    if (field.validate) {
      const error = await field.validate(value, values);
      if (error !== undefined) errors.push([field.name, error]);
    }
  }

  // fromEntries preserves arbitrary field names as own data properties.
  if (errors.length) return { errors: Object.fromEntries(errors) };
  return send(Object.fromEntries(payload));
}
