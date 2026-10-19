export async function exportSelection(rows, write) {
  if (rows.length === 0) return { kind: 'empty' };

  const blockedIds = rows
    .filter((row) => row.status !== 'ready')
    .map((row) => row.id);

  if (blockedIds.length > 0) {
    return { kind: 'blocked', ids: blockedIds };
  }

  const ids = rows.map((row) => row.id);
  await write({ schema: 1, document_ids: ids });

  return { kind: 'sent', ids };
}
