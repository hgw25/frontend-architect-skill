function decideSelectionExport(rows) {
  if (rows.length === 0) return { kind: 'empty' };

  const ids = [];
  const blockedIds = [];

  for (const row of rows) {
    if (row.status === 'ready') {
      ids.push(row.id);
    } else {
      blockedIds.push(row.id);
    }
  }

  return blockedIds.length > 0
    ? { kind: 'blocked', ids: blockedIds }
    : { kind: 'ready', ids };
}

export async function exportSelection(rows, write) {
  const decision = decideSelectionExport(rows);
  if (decision.kind !== 'ready') return decision;

  await Promise.resolve();
  const payload = { schema: 1, document_ids: decision.ids };
  await write(payload);

  return { kind: 'sent', ids: decision.ids };
}
