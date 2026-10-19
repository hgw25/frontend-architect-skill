import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSelection } from '../src/export-selection.mjs';
import { handleToolbarExport } from '../src/toolbar.mjs';
import { handleKeyboardExport } from '../src/keyboard.mjs';

test('both entry points expose the shared export capability', () => {
  assert.equal(handleToolbarExport, exportSelection);
  assert.equal(handleKeyboardExport, exportSelection);
});

test('shared capability snapshots accepted IDs before transport settles', async () => {
  let acceptWrite;
  const writeAccepted = new Promise((resolve) => { acceptWrite = resolve; });
  const rows = [{ id: 'first', status: 'ready' }];
  let payload;

  const outcome = exportSelection(rows, async (body) => {
    payload = body;
    await writeAccepted;
  });

  rows[0].id = 'changed';
  rows[0].status = 'pending';
  acceptWrite();

  assert.deepEqual(await outcome, { kind: 'sent', ids: ['first'] });
  assert.deepEqual(payload, { schema: 1, document_ids: ['first'] });
});
