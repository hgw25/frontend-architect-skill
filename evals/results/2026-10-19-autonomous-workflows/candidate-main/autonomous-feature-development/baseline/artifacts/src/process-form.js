/** Existing form submission entry point. */
export async function processForm(fields, values, send) {
  // Capture the submitted values before any asynchronous condition or validator
  // yields control back to the caller.
  const snapshot = Object.fromEntries(
    Reflect.ownKeys(values).map(key => [key, values[key]]),
  );
  const eligible = [];
  for (const field of fields) {
    if (field.disabled) continue;
    if (field.enabledWhen && !await field.enabledWhen(snapshot)) continue;
    eligible.push(field);
  }

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
