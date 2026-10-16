import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunity } from '../src/community/index.mjs';
import { rowActions } from '../src/community/ui/row-actions.mjs';
import { routes } from '../src/community/routes.mjs';
test('entry points and routes are available', () => {
  assert.equal(typeof createCommunity, 'function');
  assert.equal(typeof rowActions, 'function');
  assert.ok(routes.some(route => route.page === 'feed'));
  assert.ok(routes.some(route => route.page === 'creator-directory'));
});
