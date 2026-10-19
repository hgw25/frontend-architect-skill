import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount, formatDate } from '../src/community/format.mjs';
import { parseQuery, writeQuery } from '../src/community/query.mjs';
test('formatting uses locale and fixed date timezone', () => {
  assert.equal(formatCount(12, 'en-US'), '12');
  assert.equal(formatDate('2026-09-01T23:00:00Z', 'en-US'), 'Sep 1, 2026');
});
test('query serializer preserves unrelated parameters', () => {
  assert.deepEqual(parseQuery('?q=tools&status=all'), { title: 'tools', status: 'all' });
  assert.equal(writeQuery('?utm=feed', { title: '', status: 'published' }), 'utm=feed');
});
