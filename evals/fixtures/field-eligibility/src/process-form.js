/** Submit a schema-driven form. See README.md for the public contract. */
export async function processForm(fields, values, send) {
  const errors = {};
  for (const field of fields.filter(field => !field.disabled)) {
    if (field.required && !values[field.name]) errors[field.name] = 'Required';
  }
  for (const field of fields.filter(field => field.validate)) {
    const error = await field.validate(values[field.name], values);
    if (error) errors[field.name] = 'Invalid';
  }
  if (Object.keys(errors).length) return { errors };
  return send(Object.fromEntries(fields.map(field => [field.name, values[field.name]])));
}
