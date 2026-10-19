function decideExport(rows) {
  if (rows.length === 0) return { kind: 'empty' };
  const blocked = rows.filter((row) => row.status !== 'ready');
  if (blocked.length) return { kind: 'blocked', ids: blocked.map((row) => row.id) };
  return { kind: 'ready', ids: rows.map((row) => row.id) };
}

export async function exportSelected(rows, write) {
  const decision = decideExport(rows);
  if (decision.kind !== 'ready') return decision;
  const payload = { schema: 1, document_ids: decision.ids };
  await write(payload);
  return { kind: 'sent', ids: decision.ids };
}
