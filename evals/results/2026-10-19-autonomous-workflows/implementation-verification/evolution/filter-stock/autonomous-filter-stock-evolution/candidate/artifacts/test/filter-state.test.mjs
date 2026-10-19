import test from 'node:test';
import assert from 'node:assert/strict';
import {
  productDefaults,
  orderDefaults,
  parseProductFilters,
  serializeProductFilters,
  parseOrderFilters,
  serializeOrderFilters,
  validateDateRange,
} from '../src/filter-state.mjs';

test('product URL state distinguishes its published default from all statuses', () => {
  assert.deepEqual(parseProductFilters(new URLSearchParams()), productDefaults);
  assert.equal(parseProductFilters(new URLSearchParams('p_status=')).status, '');
  assert.equal(serializeProductFilters(productDefaults).get('p_status'), null);
  assert.equal(serializeProductFilters({ ...productDefaults, status: '' }).get('p_status'), '');
});

test('product URL state preserves valid values and rejects unknown enums', () => {
  assert.deepEqual(
    parseProductFilters(new URLSearchParams('p_q=Tea&p_category=food&p_status=draft')),
    { q: 'Tea', category: 'food', status: 'draft', stock: '' },
  );
  assert.deepEqual(
    parseProductFilters(new URLSearchParams('p_category=unknown&p_status=unknown')),
    productDefaults,
  );
});

test('order defaults cover the inclusive 30-day range ending on project today', () => {
  assert.deepEqual(orderDefaults, {
    q: '',
    from: '2026-09-20',
    to: '2026-10-19',
    status: '',
  });
  assert.deepEqual(parseOrderFilters(new URLSearchParams()), orderDefaults);
  assert.deepEqual([...serializeOrderFilters(orderDefaults).values()], [null, null, null, null]);
});

test('order URL parsing accepts only complete calendar ranges and known statuses', () => {
  assert.deepEqual(
    parseOrderFilters(new URLSearchParams('o_q=Alice&o_from=2026-10-01&o_to=2026-10-31&o_status=paid')),
    { q: 'Alice', from: '2026-10-01', to: '2026-10-31', status: 'paid' },
  );
  assert.deepEqual(
    parseOrderFilters(new URLSearchParams('o_from=2026-02-30&o_to=2026-03-02&o_status=unknown')),
    orderDefaults,
  );
});

test('date validation keeps incomplete and reversed edits invalid', () => {
  assert.match(validateDateRange('', '2026-10-19'), /complete/i);
  assert.match(validateDateRange('2026-10-30', '2026-10-19'), /before/i);
  assert.equal(validateDateRange('2026-10-19', '2026-10-19'), '');
});
