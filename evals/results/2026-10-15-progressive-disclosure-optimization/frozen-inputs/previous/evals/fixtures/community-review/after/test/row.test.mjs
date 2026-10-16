import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowActions } from '../src/community/ui/row-actions.mjs';
test('published unowned activity opens and can be acquired', () => {
  const calls = [];
  const actions = rowActions({ id: 'p1', activityId: 'a1', status: 'published', owned: false },
    { acquire: id => calls.push(id), toggleFavorite() {} });
  assert.equal(actions.detailHref, '/activities/a1');
  assert.equal(actions.acquireDisabled, false);
  actions.acquire();
  assert.deepEqual(calls, ['a1']);
});
test('owned activity remains readable', () => {
  const actions = rowActions({ id: 'p1', activityId: 'a1', status: 'published', owned: true }, {});
  assert.equal(actions.detailHref, '/activities/a1');
  assert.equal(actions.acquireDisabled, true);
});
