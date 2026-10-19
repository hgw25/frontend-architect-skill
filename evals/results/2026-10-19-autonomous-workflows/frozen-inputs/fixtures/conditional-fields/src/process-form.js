/** Existing form submission entry point. */
export async function processForm(fields, values, send) {
  const eligible = fields.filter(field => !field.disabled);
  const errors = {};
  for (const field of eligible) {
    const value = Object.hasOwn(values, field.name) ? values[field.name] : undefined;
    let error;
    if (field.required && (value === undefined || value === null || value === '')) {
      error = 'Required';
    } else if (field.validate) {
      error = await field.validate(value, values);
    }
    if (error) Object.defineProperty(errors, field.name, { value: error, enumerable: true });
  }
  if (Object.keys(errors).length) return { errors };
  return send(Object.fromEntries(eligible.map(field => [field.name,
    Object.hasOwn(values, field.name) ? values[field.name] : undefined])));
}
