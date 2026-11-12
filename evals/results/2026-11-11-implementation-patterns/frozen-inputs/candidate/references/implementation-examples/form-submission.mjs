/** Return the fields participating in validation and submission. */
export function submissionFields(fields) {
  return fields.filter(field => !field.disabled);
}

/**
 * Values are flat string/number/boolean/nullish form values; fields are trusted
 * configuration. Disabled values remain in the draft but are never sent.
 * Validators return an error message or no error; unexpected failures reject.
 */
export async function submitForm(fields, values, send) {
  const active = submissionFields(fields);
  const submitted = { ...values };
  const errors = [];

  for (const field of active) {
    const value = submitted[field.name];
    if (field.required && (value === '' || value == null)) {
      errors.push([field.name, 'Required']);
      continue;
    }
    const error = await field.validate?.(value, submitted);
    if (error) errors.push([field.name, error]);
  }

  if (errors.length) {
    return { kind: 'invalid', errors: Object.fromEntries(errors) };
  }
  const payload = Object.fromEntries(
    active.map(field => [field.name, submitted[field.name]]),
  );
  const receipt = await send(payload);
  return { kind: 'sent', receipt };
}
