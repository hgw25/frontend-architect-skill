/** Existing form submission entry point. */
export async function processForm(fields, values, send) {
  const valuesSnapshot = { ...values };
  const activeFields = fields.filter(field =>
    !field.disabled && (!field.enabledWhen || field.enabledWhen(valuesSnapshot)));
  const errors = {};
  for (const field of activeFields) {
    const value = Object.hasOwn(valuesSnapshot, field.name)
      ? valuesSnapshot[field.name]
      : undefined;
    let error;
    if (field.required && (value === undefined || value === null || value === '')) {
      error = 'Required';
    } else if (field.validate) {
      error = await field.validate(value, valuesSnapshot);
    }
    if (error) Object.defineProperty(errors, field.name, { value: error, enumerable: true });
  }
  if (Object.keys(errors).length) return { errors };
  return send(Object.fromEntries(activeFields.map(field => [field.name,
    Object.hasOwn(valuesSnapshot, field.name) ? valuesSnapshot[field.name] : undefined])));
}
