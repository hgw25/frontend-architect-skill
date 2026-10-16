import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCreatorDirectory } from '../src/community/controllers/creator-directory.mjs';
test('directory publishes creator results', async () => {
  const directory = createCreatorDirectory({ creators: async () => [{ id: 'c1', name: 'Ada' }] });
  await directory.refresh();
  assert.equal(directory.snapshot.items[0].name, 'Ada');
  assert.equal(directory.snapshot.loading, false);
});
