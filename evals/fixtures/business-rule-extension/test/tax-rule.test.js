import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder, submitOrder } from '../src/order-form.js';

test('business tax-ID required feedback and command admission agree for all existing empty values', async () => {
  for (const taxId of [undefined, null, '']) {
    const draft = { customerType: 'business', companyName: 'Acme', taxId, note: '' };
    const before = structuredClone(draft);
    assert.deepEqual(validateOrder(draft), { taxId: 'Required' });
    assert.deepEqual(await submitOrder(draft, () => assert.fail('must not send')), {
      errors: { taxId: 'Required' },
    });
    assert.deepEqual(draft, before);
  }
});

test('switching customer type reevaluates the existing conditional rules', async () => {
  const draft = { customerType: 'business', companyName: '', taxId: '', note: '' };
  assert.deepEqual(validateOrder(draft), { companyName: 'Required', taxId: 'Required' });
  draft.customerType = 'personal';
  assert.deepEqual(validateOrder(draft), {});
  const payloads = [];
  assert.deepEqual(await submitOrder(draft, async payload => payloads.push(payload)), { sent: true });
  assert.equal(payloads.length, 1);
  assert.deepEqual(payloads[0], draft);
});

test('the rule adds no tax-ID formatting restriction or payload rewrite', async () => {
  const draft = { customerType: 'business', companyName: 'Acme', taxId: ' ', note: '' };
  const payloads = [];
  assert.deepEqual(validateOrder(draft), {});
  await submitOrder(draft, async payload => payloads.push(payload));
  assert.deepEqual(payloads, [draft]);
});
