import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';

test('inactive conditional field cannot validate, block or submit', async () => {
  const result = await processForm([
    { name: 'kind' },
    { name: 'company', enabledWhen: values => values.kind === 'business', required: true,
      validate() { assert.fail('inactive validator ran'); } },
  ], { kind: 'personal', company: '', unknown: 1 }, payload => payload);
  assert.deepEqual(result, { kind: 'personal' });
});

test('conditional field is recalculated once on each submission', async () => {
  let calls = 0;
  const fields = [{ name: 'company', required: true,
    enabledWhen(values) { calls++; return values.kind === 'business'; } }];
  assert.deepEqual(await processForm(fields, { kind: 'personal' }, x => x), {});
  assert.deepEqual(await processForm(fields, { kind: 'business', company: '' }, () => assert.fail('sent')),
    { errors: { company: 'Required' } });
  assert.deepEqual(await processForm(fields, { kind: 'business', company: 'Acme' }, x => x), { company: 'Acme' });
  assert.equal(calls, 3);
});

test('disabled wins over the conditional callback', async () => {
  assert.deepEqual(await processForm([{ name: 'old', disabled: true,
    enabledWhen() { assert.fail('disabled condition ran'); } }], { old: 1 }, x => x), {});
});

test('conditions, validators and payload use the same top-level submission snapshot', async () => {
  let release;
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const values = { kind: 'business', company: 'Before' };
  let conditionSnapshot;
  let validatorSnapshot;
  const pending = processForm([
    { name: 'kind', validate: async (value, snapshot) => { validatorSnapshot = snapshot; started(); await gate; } },
    { name: 'company', enabledWhen(snapshot) { conditionSnapshot = snapshot; return snapshot.kind === 'business'; },
      validate(value, snapshot) { assert.equal(value, 'Before'); assert.equal(snapshot, validatorSnapshot); } },
  ], values, x => x);
  await entered;
  values.kind = 'personal'; values.company = 'After';
  release();
  assert.deepEqual(await pending, { kind: 'business', company: 'Before' });
  assert.equal(conditionSnapshot, validatorSnapshot);
  assert.notEqual(conditionSnapshot, values);
  assert.deepEqual(values, { kind: 'personal', company: 'After' });
});

test('conditional failures propagate with their original identity', async () => {
  const failure = new Error('condition failed');
  await assert.rejects(processForm([{ name: 'x', enabledWhen() { throw failure; } }], { x: 1 },
    () => assert.fail('sent')), error => error === failure);
});

test('conditional prototype-like names remain own payload keys', async () => {
  let calls = 0;
  const result = await processForm([{ name: '__proto__', enabledWhen() { calls++; return false; } }],
    { ['__proto__']: 'hidden' }, x => x);
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(calls, 1);
});
