import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeedController } from '../src/community/controllers/feed.mjs';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test('late error cannot clear a newer pending query', async () => {
  const a = deferred(), b = deferred();
  const queue = [a, b];
  const feed = createFeedController({ list: () => queue.shift().promise });
  const first = feed.search({ title: 'a', status: 'published' });
  const second = feed.search({ title: 'b', status: 'published' });
  a.reject(new Error('old error'));
  await first;
  assert.equal(feed.snapshot.loading, true);
  assert.equal(feed.snapshot.error, null);
  b.resolve({ items: [], cursor: null });
  await second;
  assert.equal(feed.snapshot.loading, false);
  assert.deepEqual(feed.snapshot.items, []);
});
test('pagination appends to current result', async () => {
  const pages = [{ items: [{ id: 'one' }], cursor: 'next' }, { items: [{ id: 'two' }], cursor: null }];
  const feed = createFeedController({ list: async () => pages.shift() });
  await feed.refresh();
  await feed.loadMore();
  assert.deepEqual(feed.snapshot.items.map(item => item.id), ['one', 'two']);
});
