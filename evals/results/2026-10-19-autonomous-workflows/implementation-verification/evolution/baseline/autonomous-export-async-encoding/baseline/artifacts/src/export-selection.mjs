import { encodeSelection } from './codec.mjs';

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

  // Capture the accepted intent before yielding to the encoder. The caller may
  // update its live selection while encoding or transport is pending.
  const ids = rows.map((row) => row.id);
  const payload = await encodeSelection(ids);
  await write(payload);

  return { kind: 'sent', ids };
}
