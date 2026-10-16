function decideExport(rows) {
  if (rows.length === 0) return { kind: 'empty' };

  const blockedIds = rows
    .filter((row) => row.status !== 'ready')
    .map((row) => row.id);

  if (blockedIds.length > 0) {
    return { kind: 'blocked', ids: blockedIds };
  }

  return { kind: 'ready', ids: rows.map((row) => row.id) };
}

function createExportPayload(ids) {
  return { schema: 1, document_ids: ids };
}

export async function exportSelection(rows, write) {
  const decision = decideExport(rows);
  if (decision.kind !== 'ready') return decision;

  await write(createExportPayload(decision.ids));
  return { kind: 'sent', ids: decision.ids };
}
