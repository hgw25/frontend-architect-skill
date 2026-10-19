
FILE before/README.md
# Selection export

This frontend capability has toolbar and keyboard entry points. Both export one
selection as one operation; no consumer needs a pausable preparation workflow.
The files in src are internal except for the two entry points below.

Keep these public contracts:

- `handleToolbarExport(rows, write)` and `handleKeyboardExport(rows, write)`.
- Rows are already validated internal data with `id` and `status`. Only `ready`
  rows are eligible. Preserve selection order; do not mutate the caller's rows.
- Empty selection returns `{ kind: 'empty' }`. Any ineligible row prevents all
  writes and returns `{ kind: 'blocked', ids }` naming the ineligible rows.
- Eligible selection writes exactly once with `{ schema: 1, document_ids: ids }`
  and returns `{ kind: 'sent', ids }` after acceptance. `write` is the existing
  trusted transport capability and borrows the payload without mutating it.
- The submitted IDs remain stable while awaiting acceptance. A transport failure
  rejects with the original error; it does not become a successful empty result.

Run `node --test test/export.test.mjs`.


FILE before/src/export-selection.mjs
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


FILE before/src/keyboard.mjs
import { exportSelected } from './export-selection.mjs';

export function handleKeyboardExport(rows, write) {
  return exportSelected(rows, write);
}


FILE before/src/toolbar.mjs
import { exportSelected } from './export-selection.mjs';

export function handleToolbarExport(rows, write) {
  return exportSelected(rows, write);
}


FILE before/test/export.test.mjs
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


FILE after/README.md
# Selection export

This frontend capability has toolbar and keyboard entry points. Both export one
selection as one operation; no consumer needs a pausable preparation workflow.
The files in src are internal except for the two entry points below.

Keep these public contracts:

- `handleToolbarExport(rows, write)` and `handleKeyboardExport(rows, write)`.
- Rows are already validated internal data with `id` and `status`. Only `ready`
  rows are eligible. Preserve selection order; do not mutate the caller's rows.
- Empty selection returns `{ kind: 'empty' }`. Any ineligible row prevents all
  writes and returns `{ kind: 'blocked', ids }` naming the ineligible rows.
- Eligible selection writes exactly once with `{ schema: 1, document_ids: ids }`
  and returns `{ kind: 'sent', ids }` after acceptance. `write` is the existing
  trusted transport capability and borrows the payload without mutating it.
- The submitted IDs remain stable while awaiting acceptance. A transport failure
  rejects with the original error; it does not become a successful empty result.

Run `node --test test/export.test.mjs`.


FILE after/src/export-steps.mjs
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


FILE after/src/keyboard.mjs
import { begin, classify, encode, dispatch } from './export-steps.mjs';

export async function handleKeyboardExport(rows, write) {
  const context = begin(rows, write);
  classify(context);
  encode(context);
  return dispatch(context);
}


FILE after/src/toolbar.mjs
import { begin, classify, encode, dispatch } from './export-steps.mjs';

export async function handleToolbarExport(rows, write) {
  const context = begin(rows, write);
  classify(context);
  encode(context);
  return dispatch(context);
}


FILE after/test/export.test.mjs
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
