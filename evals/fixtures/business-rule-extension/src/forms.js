export function validateFields(fields, draft) {
  return Object.fromEntries(fields.flatMap(field => {
    const required = typeof field.required === 'function'
      ? field.required(draft)
      : field.required;
    const value = draft[field.name];
    return required && (value === undefined || value === null || value === '')
      ? [[field.name, 'Required']]
      : [];
  }));
}

export async function submitFields(fields, draft, send) {
  const errors = validateFields(fields, draft);
  if (Object.keys(errors).length) return { errors };
  await send(Object.fromEntries(fields.map(field => [field.name, draft[field.name]])));
  return { sent: true };
}
