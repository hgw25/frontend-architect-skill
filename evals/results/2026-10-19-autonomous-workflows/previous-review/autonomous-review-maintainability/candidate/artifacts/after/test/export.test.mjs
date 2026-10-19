import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleToolbarExport } from '../src/toolbar.mjs';
import { handleKeyboardExport } from '../src/keyboard.mjs';

for (const [name, exportSelection] of Object.entries({ toolbar: handleToolbarExport, keyboard: handleKeyboardExport })) {
  test(name + ': empty does not write', async () => {
    const outcome = await exportSelection([], () => assert.fail('Unexpected write'));
    assert.deepEqual(outcome, { kind: 'empty' });
  });
  test(name + ': ineligible selection is all-or-nothing', async () => {
    const rows = [{ id: 'a', status: 'ready' }, { id: 'b', status: 'pending' }];
    const outcome = await exportSelection(rows, () => assert.fail('Unexpected partial write'));
    assert.deepEqual(outcome, { kind: 'blocked', ids: ['b'] });
    assert.deepEqual(rows, [{ id: 'a', status: 'ready' }, { id: 'b', status: 'pending' }]);
  });
  test(name + ': ready selection writes the owned protocol once in selection order', async () => {
    const calls = [];
    const rows = [{ id: 'b', status: 'ready' }, { id: 'a', status: 'ready' }];
    const outcome = await exportSelection(rows, async (body) => { calls.push(body); });
    assert.deepEqual(calls, [{ schema: 1, document_ids: ['b', 'a'] }]);
    assert.deepEqual(outcome, { kind: 'sent', ids: ['b', 'a'] });
    assert.deepEqual(rows, [{ id: 'b', status: 'ready' }, { id: 'a', status: 'ready' }]);
  });
  test(name + ': transport errors retain their meaning', async () => {
    const failure = new Error('Storage unavailable');
    await assert.rejects(exportSelection([{ id: 'a', status: 'ready' }], async () => { throw failure; }),
      (error) => error === failure);
  });
  test(name + ': accepted intent does not drift during a pending write', async () => {
    let release;
    const accepted = new Promise((resolve) => { release = resolve; });
    const rows = [{ id: 'a', status: 'ready' }];
    let payload;
    const outcome = exportSelection(rows, async (body) => { payload = body; await accepted; });
    rows[0].id = 'changed'; rows[0].status = 'pending';
    release();
    assert.deepEqual(await outcome, { kind: 'sent', ids: ['a'] });
    assert.deepEqual(payload, { schema: 1, document_ids: ['a'] });
  });
}
