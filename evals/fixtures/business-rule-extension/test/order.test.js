import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder, submitOrder } from '../src/order-form.js';

test('personal orders keep optional fields and the owned payload shape', async () => {
  const draft = { customerType: 'personal', companyName: '', taxId: '', note: 'Hi', extra: 'omit' };
  const payloads = [];
  assert.deepEqual(validateOrder(draft), {});
  assert.deepEqual(await submitOrder(draft, async payload => payloads.push(payload)), { sent: true });
  assert.deepEqual(payloads, [{ customerType: 'personal', companyName: '', taxId: '', note: 'Hi' }]);
  assert.equal(draft.extra, 'omit');
});

test('existing business company-name validation still prevents sending', async () => {
  const draft = { customerType: 'business', companyName: '', taxId: 'T1', note: '' };
  assert.deepEqual(validateOrder(draft), { companyName: 'Required' });
  assert.deepEqual(await submitOrder(draft, () => assert.fail('must not send')), {
    errors: { companyName: 'Required' },
  });
});

test('successful writes retain transport rejection and source draft', async () => {
  const draft = { customerType: 'business', companyName: 'Acme', taxId: 'T1', note: '' };
  const original = structuredClone(draft);
  const failure = new Error('offline');
  await assert.rejects(submitOrder(draft, async () => { throw failure; }), error => error === failure);
  assert.deepEqual(draft, original);
});
