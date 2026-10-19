export async function exportSelection(rows, write) {
  if (rows.length === 0) return { kind: 'empty' };

  const ids = [];
  const blockedIds = [];
  for (const row of rows) {
    ids.push(row.id);
    if (row.status !== 'ready') blockedIds.push(row.id);
  }

  if (blockedIds.length > 0) {
    return { kind: 'blocked', ids: blockedIds };
  }

  await write({ schema: 1, document_ids: ids });
  return { kind: 'sent', ids };
}
