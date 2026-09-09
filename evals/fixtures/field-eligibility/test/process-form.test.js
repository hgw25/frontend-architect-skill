import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';

test('disabled validation never runs or blocks, and payload excludes disabled/unknown fields', async () => {
  let calls = 0;
  const result = await processForm([
    { name: 'name', required: true },
    { name: 'legacy', disabled: true, required: true, validate() { throw Error('must not run'); } },
  ], { name: 'Ada', legacy: 'secret', unknown: 'extra' }, payload => { calls++; assert.deepEqual(payload, { name: 'Ada' }); return 'sent'; });
  assert.equal(result, 'sent'); assert.equal(calls, 1);
});
test('zero false whitespace and empty arrays satisfy required', async () => {
  const values = { count: 0, consent: false, text: ' ', items: [] };
  const fields = Object.keys(values).map(name => ({ name, required: true }));
  assert.deepEqual(await processForm(fields, values, payload => payload), values);
});
test('all specified empty representations fail and skip custom validation', async () => {
  const values = { absent: undefined, nil: null, blank: '' };
  const fields = Object.keys(values).map(name => ({ name, required: true, validate() { assert.fail('required failure must short circuit this field'); } }));
  const result = await processForm(fields, values, () => assert.fail('invalid form sent'));
  assert.deepEqual(result, { errors: { absent: 'Required', nil: 'Required', blank: 'Required' } });
});
test('async validator preserves specific error and blocks send', async () => {
  const result = await processForm([{ name: 'name', validate: async () => 'Already taken' }], { name: 'Ada' }, () => assert.fail('invalid form sent'));
  assert.deepEqual(result, { errors: { name: 'Already taken' } });
});
test('send waits for custom validation and returns the send result without mutation', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; }); let sent = 0;
  const fields = Object.freeze([Object.freeze({ name: 'value', validate: () => gate })]);
  const values = Object.freeze({ value: 1 });
  const pending = processForm(fields, values, async payload => { sent++; return { saved: payload.value }; });
  await Promise.resolve(); assert.equal(sent, 0); release(undefined);
  assert.deepEqual(await pending, { saved: 1 }); assert.equal(sent, 1);
});
test('validator and transport rejections propagate', async () => {
  const failure = Error('offline');
  await assert.rejects(processForm([{ name: 'x', validate: async () => { throw failure; } }], { x: 1 }, () => assert.fail('sent')), error => error === failure);
  await assert.rejects(processForm([{ name: 'x' }], { x: 1 }, async () => { throw failure; }), error => error === failure);
});
test('prototype-like names remain own error and payload keys', async () => {
  const fields = [{ name: '__proto__', required: true }];
  const result = await processForm(fields, {}, () => assert.fail('sent'));
  assert.equal(Object.hasOwn(result.errors, '__proto__'), true); assert.equal(result.errors.__proto__, 'Required');
  const payload = await processForm(fields, { ['__proto__']: 'value' }, payload => payload);
  assert.equal(Object.hasOwn(payload, '__proto__'), true); assert.equal(payload.__proto__, 'value');
});
