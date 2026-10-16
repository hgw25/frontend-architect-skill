import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFavorites } from '../src/community/controllers/favorites.mjs';
import { rowActions } from '../src/community/ui/row-actions.mjs';
test('local favorite uses post identity even without an activity', () => {
  const favorites = createFavorites();
  const actions = rowActions({ id: 'p1', activityId: null, status: 'unavailable', owned: false },
    { toggleFavorite: id => favorites.toggle(id) });
  actions.toggleFavorite();
  assert.equal(favorites.has('p1'), true);
});
