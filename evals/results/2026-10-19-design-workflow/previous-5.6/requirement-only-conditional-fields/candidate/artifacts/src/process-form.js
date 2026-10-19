/** Existing form submission entry point. */
export async function processForm(fields, values, send) {
  const snapshot = { ...values };
  const eligible = fields.filter(field => {
    if (field.disabled) return false;
    return field.enabledWhen === undefined || field.enabledWhen(snapshot) === true;
  });
  const errors = {};
  for (const field of eligible) {
    const value = Object.hasOwn(snapshot, field.name) ? snapshot[field.name] : undefined;
    let error;
    if (field.required && (value === undefined || value === null || value === '')) {
      error = 'Required';
    } else if (field.validate) {
      error = await field.validate(value, snapshot);
    }
    if (error) Object.defineProperty(errors, field.name, { value: error, enumerable: true });
  }
  if (Object.keys(errors).length) return { errors };
  return send(Object.fromEntries(eligible.map(field => [field.name,
    Object.hasOwn(snapshot, field.name) ? snapshot[field.name] : undefined])));
}
