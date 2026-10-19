import test from 'node:test';
import assert from 'node:assert/strict';
import { queryProducts } from '../src/query.mjs';

const publishedProducts = { q: '', category: '', status: 'published' };

test('product query composes stock membership with existing filters', async () => {
  const inStock = await queryProducts({ ...publishedProducts, stock: 'in' });
  const outOfStock = await queryProducts({ ...publishedProducts, stock: 'out' });
  const foodInStock = await queryProducts({
    ...publishedProducts,
    category: 'food',
    stock: 'in',
  });

  assert.deepEqual(inStock.rows.map(product => product.id), ['p1']);
  assert.deepEqual(outOfStock.rows.map(product => product.id), ['p2', 'p4']);
  assert.deepEqual(foodInStock.rows, []);
});
