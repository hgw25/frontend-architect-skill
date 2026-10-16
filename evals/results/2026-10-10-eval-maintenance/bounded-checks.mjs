import assert from 'node:assert/strict';
import { createCommunity } from '/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-j0b5zve5/after/src/community/index.mjs';
const labels = [{ id: 'general', name: 'General' }];
const make = (overrides = {}) => createCommunity({ list: async () => ({ items: [], cursor: null }), creators: async () => [], publish: async () => {}, ...overrides }, labels);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
let failures = 0;
async function check(name, run) { try { await run(); console.log('PASS:', name); } catch (error) { failures++; console.log('FAIL:', name, error.message); } }
await check('Retry retains failed title and category after editing', async () => {
  const sent = [];
  const c = make({ publish: async body => { sent.push(body); if (sent.length === 1) throw new Error('offline'); } });
  c.draft.editTitle('Release A');
  await c.publish.submit();
  c.draft.editTitle('Release B'); c.draft.selectCategory('tools');
  await c.publish.retry();
  assert.deepEqual(sent[1], { title: 'Release A', category: 'general' });
});
await check('Foreground updates the already-loaded creator directory', async () => {
  let version = 'old'; let calls = 0;
  const c = make({ creators: async () => { calls++; return [{ id: 'c1', name: version, avatarUrl: version, summary: version }]; } });
  await c.creatorDirectory.refresh(); version = 'new';
  await c.onForeground();
  assert.equal(calls, 2);
  assert.equal(c.creatorDirectory.snapshot.items[0].name, 'new');
});
await check('Pending publish snapshots input, prevents duplicates, and preserves newer draft', async () => {
  const wait = deferred(); const sent = [];
  const c = make({ publish: body => { sent.push(body); return wait.promise; } });
  c.draft.editTitle('A'); const first = c.publish.submit();
  c.draft.editTitle('B'); c.draft.selectCategory('tools');
  await c.publish.submit(); await c.publish.retry();
  assert.equal(sent.length, 1); assert.deepEqual(sent[0], { title: 'A', category: 'general' });
  assert.equal(c.publish.snapshot.pending, true);
  wait.resolve(); await first;
  assert.deepEqual(c.draft.snapshot, { title: 'B', category: 'tools' });
  assert.deepEqual(c.publish.snapshot, { pending: false, error: null, canRetry: false });
});
await check('Ordinary submit after failure uses current draft and clears error', async () => {
  const sent = []; const c = make({ publish: async body => { sent.push(body); if (sent.length === 1) throw new Error('offline'); } });
  c.draft.editTitle('A'); await c.publish.submit();
  assert.equal(c.publish.snapshot.canRetry, true);
  c.draft.editTitle('B'); c.draft.selectCategory('tools'); await c.publish.submit();
  assert.deepEqual(sent[1], { title: 'B', category: 'tools' });
  assert.deepEqual(c.publish.snapshot, { pending: false, error: null, canRetry: false });
});
await check('Foreground retains draft, favorites and immutable categories across success and failure', async () => {
  let calls = 0; const c = make({ list: async () => { calls++; if (calls === 2) throw new Error('offline'); return { items: [{ id: 'p1' }], cursor: null }; } });
  c.draft.editTitle('draft'); c.draft.selectCategory('tools'); c.favorites.toggle('p1'); const categories = c.categories.snapshot;
  await c.onForeground(); assert.deepEqual(c.feed.snapshot.items, [{ id: 'p1' }]);
  await c.onForeground(); assert.equal(c.feed.snapshot.error.message, 'offline');
  assert.deepEqual(c.draft.snapshot, { title: 'draft', category: 'tools' });
  assert.equal(c.favorites.has('p1'), true); assert.equal(c.categories.snapshot, categories);
});
await check('Late foreground failure cannot overwrite newer foreground success', async () => {
  const a = deferred(), b = deferred(); const queue = [a, b];
  const c = make({ list: () => queue.shift().promise });
  const first = c.onForeground(); const second = c.onForeground();
  b.resolve({ items: [{ id: 'new' }], cursor: null }); await second;
  a.reject(new Error('old')); await first;
  assert.deepEqual(c.feed.snapshot.items, [{ id: 'new' }]);
  assert.equal(c.feed.snapshot.error, null); assert.equal(c.feed.snapshot.loading, false);
});
console.log(`Checks: 6; failures: ${failures}`);
process.exitCode = failures ? 1 : 0;
