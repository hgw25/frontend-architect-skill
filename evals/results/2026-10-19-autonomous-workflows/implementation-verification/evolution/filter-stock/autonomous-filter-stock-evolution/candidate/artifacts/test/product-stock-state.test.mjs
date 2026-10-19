import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_KEYS,
  productDefaults,
  parseProductFilters,
  serializeProductFilters,
} from '../src/filter-state.mjs';

test('product stock defaults to all and is an owned URL field', () => {
  assert.equal(productDefaults.stock, '');
  assert.ok(PRODUCT_KEYS.includes('p_stock'));
  assert.equal(serializeProductFilters(productDefaults).get('p_stock'), null);
});

test('product stock URL state accepts known values and rejects unknown values', () => {
  assert.equal(parseProductFilters(new URLSearchParams('p_stock=in')).stock, 'in');
  assert.equal(parseProductFilters(new URLSearchParams('p_stock=out')).stock, 'out');
  assert.equal(parseProductFilters(new URLSearchParams('p_stock=unknown')).stock, '');
  assert.equal(serializeProductFilters({ ...productDefaults, stock: 'in' }).get('p_stock'), 'in');
});
