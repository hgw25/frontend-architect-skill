import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';

test('non-submitted fields still enforce required and custom validation', async () => {
  const errors = await processForm([
    { name: 'token', submit: false, required: true },
    { name: 'confirm', submit: false, validate: async () => 'Mismatch' },
  ], { token: '', confirm: 'bad' }, () => assert.fail('invalid form sent'));
  assert.deepEqual(errors, { errors: { token: 'Required', confirm: 'Mismatch' } });
});

test('submission policy preserves original values for validators and input objects', async () => {
  const values = Object.freeze({ confirm: 'Ada', name: 'Ada' });
  const fields = Object.freeze([
    Object.freeze({ name: 'confirm', submit: false }),
    Object.freeze({ name: 'name', validate: (value, all) => {
      assert.equal(all, values);
      assert.equal(value, all.confirm);
    } }),
  ]);
  assert.deepEqual(await processForm(fields, values, payload => payload), { name: 'Ada' });
});

test('disabled still wins and explicit submit true behaves like the default', async () => {
  const result = await processForm([
    { name: 'hidden', disabled: true, submit: true, validate: () => assert.fail('disabled validated') },
    { name: 'a', submit: true }, { name: 'b' }, { name: 'c', submit: false },
  ], { hidden: 1, a: 0, b: false, c: 2 }, payload => payload);
  assert.deepEqual(result, { a: 0, b: false });
});

test('non-submitted async failures propagate and prototype-like fields remain valid', async () => {
  const failure = new Error('validator failed');
  await assert.rejects(processForm([
    { name: 'x', submit: false, validate: async () => { throw failure; } },
  ], { x: 1 }, () => assert.fail('sent')), error => error === failure);
  const payload = await processForm([
    { name: '__proto__', submit: false }, { name: 'constructor' },
  ], { ['__proto__']: 1, constructor: 2 }, payload => payload);
  assert.equal(Object.hasOwn(payload, '__proto__'), false);
  assert.equal(Object.hasOwn(payload, 'constructor'), true);
  assert.equal(payload.constructor, 2);
});
