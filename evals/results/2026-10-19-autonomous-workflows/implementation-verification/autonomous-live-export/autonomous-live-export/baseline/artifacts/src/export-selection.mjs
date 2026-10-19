/**
 * Export a selection as one atomic operation.
 *
 * Toolbar and keyboard interactions intentionally share this workflow so the
 * eligibility and wire-format contracts cannot drift between entry points.
 */
export async function exportSelection(rows, write) {
  if (rows.length === 0) return { kind: 'empty' };

  const blockedIds = rows
    .filter((row) => row.status !== 'ready')
    .map((row) => row.id);

  if (blockedIds.length > 0) {
    return { kind: 'blocked', ids: blockedIds };
  }

  // Capture the accepted intent before yielding to the transport. The caller
  // may update its live selection while the write is pending.
  const ids = rows.map((row) => row.id);
  await write({ schema: 1, document_ids: ids });

  return { kind: 'sent', ids };
}
