export function begin(rows, write) {
  return { rows, write, decision: undefined, payload: undefined };
}

export function classify(context) {
  const blocked = context.rows.filter((row) => row.status !== 'ready');
  context.decision = context.rows.length === 0
    ? { kind: 'empty' }
    : blocked.length
      ? { kind: 'blocked', ids: blocked.map((row) => row.id) }
      : { kind: 'ready', ids: context.rows.map((row) => row.id) };
}

export function encode(context) {
  if (context.decision.kind === 'ready') {
    context.payload = { schema: 1, document_ids: context.decision.ids };
  }
}

export async function dispatch(context) {
  if (context.decision.kind !== 'ready') return context.decision;
  await context.write(context.payload);
  return { kind: 'sent', ids: context.decision.ids };
}
