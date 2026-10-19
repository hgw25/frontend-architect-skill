import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';

test('a conditional field participates only when its predicate returns true', async () => {
  const fields = [{ name: 'conditional', enabledWhen: () => 1, required: true }];

  assert.deepEqual(await processForm(fields, { conditional: '' }, payload => payload), {});
});

test('the submission snapshot retains non-enumerable own field values', async () => {
  const values = {};
  Object.defineProperty(values, 'token', { value: 'captured', enumerable: false });
  let predicateSnapshot;

  const result = await processForm([
    {
      name: 'token',
      enabledWhen(snapshot) {
        predicateSnapshot = snapshot;
        return true;
      },
      validate(value, snapshot) {
        assert.equal(value, 'captured');
        assert.equal(snapshot, predicateSnapshot);
      },
    },
  ], values, payload => payload);

  assert.deepEqual(result, { token: 'captured' });
});
