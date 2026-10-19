import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultOrderFilters,
  productFiltersFromUrl,
  urlWithProductFilters,
  urlWithOrderFilters,
  validateOrderFilters,
} from '../src/filters.mjs';

test('product URL distinguishes its default status from explicit all statuses', () => {
  const initial = new URL('http://example.test/?page=products&utm=keep');
  assert.deepEqual(productFiltersFromUrl(initial), {
    q: '', category: '', status: 'published',
  });

  const updated = urlWithProductFilters(initial, {
    q: 'Tea', category: 'food', status: '',
  });
  assert.equal(updated.searchParams.get('utm'), 'keep');
  assert.equal(updated.searchParams.get('p_q'), 'Tea');
  assert.equal(updated.searchParams.get('p_category'), 'food');
  assert.equal(updated.searchParams.get('p_status'), '');
  assert.equal(productFiltersFromUrl(updated).status, '');
});

test('order defaults and validation follow the fixed project calendar', () => {
  assert.deepEqual(defaultOrderFilters(), {
    q: '', status: '', from: '2026-09-20', to: '2026-10-19',
  });
  assert.match(
    validateOrderFilters({ q: '', status: '', from: '2026-10-20', to: '2026-10-19' }),
    /before/i,
  );
  assert.match(
    validateOrderFilters({ q: '', status: '', from: '', to: '2026-10-19' }),
    /date/i,
  );
  assert.equal(
    validateOrderFilters({ q: '', status: '', from: '2026-10-19', to: '2026-10-19' }),
    null,
  );
});

test('order URL updates retain parameters outside the order contract', () => {
  const updated = urlWithOrderFilters(
    new URL('http://example.test/?page=orders&utm=keep'),
    { q: 'Alice', status: 'paid', from: '2026-10-01', to: '2026-10-19' },
  );
  assert.equal(updated.searchParams.get('utm'), 'keep');
  assert.equal(updated.searchParams.get('o_q'), 'Alice');
  assert.equal(updated.searchParams.get('o_status'), 'paid');
});
