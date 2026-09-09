import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';
test('readOnly required field still participates in validation', async () => {
  const result = await processForm([{ name: 'serverName', readOnly: true, required: true }], { serverName: '' }, () => assert.fail('sent invalid'));
  assert.deepEqual(result, { errors: { serverName: 'Required' } });
});
test('readOnly custom validation remains effective and specific', async () => {
  const result = await processForm([{ name: 'serverName', readOnly: true, validate: async () => 'Expired value' }], { serverName: 'old' }, () => assert.fail('sent invalid'));
  assert.deepEqual(result, { errors: { serverName: 'Expired value' } });
});
test('readOnly values submit while disabled readOnly fields never validate or submit', async () => {
  const result = await processForm([
    { name: 'fixed', readOnly: true, required: true },
    { name: 'unused', readOnly: true, disabled: true, validate: () => assert.fail('disabled validated') },
  ], { fixed: 0, unused: 1 }, payload => payload);
  assert.deepEqual(result, { fixed: 0 });
});
