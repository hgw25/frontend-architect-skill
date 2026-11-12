import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearch } from '../src/search.js';
function setup() {
  const requests = [];
  return { requests, search: createSearch(query => new Promise((resolve, reject) => requests.push({ query, resolve, reject }))) };
}
const empty = { draft: '', submitted: '', status: 'idle', items: [], error: null };
test('reset clears public state and invalidates prior success and failure', async () => {
  const { search, requests } = setup();
  search.setDraft('old-a'); const a = search.submit(); search.setDraft('old-b'); const b = search.submit();
  search.reset(); assert.deepEqual(search.getState(), empty);
  const retry = search.retry(); assert.equal(requests.length, 2); await retry;
  requests[0].resolve([{ user_id: 'a', display_name: 'A' }]); requests[1].reject(Error('stale'));
  await Promise.all([a, b]); assert.deepEqual(search.getState(), empty);
});
test('reset permits a new request which owns loading despite prior completions', async () => {
  const { search, requests } = setup();
  search.setDraft('old'); const old = search.submit(); search.reset(); search.setDraft('fresh'); const fresh = search.submit();
  assert.equal(requests.length, 2); assert.equal(requests[1].query, 'fresh');
  requests[0].resolve([{ user_id: 'old', display_name: 'Old' }]); await old;
  assert.deepEqual(search.getState(), { draft: 'fresh', submitted: 'fresh', status: 'loading', items: [], error: null });
  requests[1].resolve([{ user_id: 'fresh', display_name: 'Fresh' }]); await fresh;
  assert.deepEqual(search.getState().items, [{ id: 'fresh', label: 'Fresh' }]);
});
test('reset clears successful results and dispose prevents reset', async () => {
  const { search, requests } = setup(); search.setDraft('seed'); const seed = search.submit(); requests[0].resolve([{ user_id: 's', display_name: 'Seed' }]); await seed;
  search.reset(); assert.deepEqual(search.getState(), empty);
  search.setDraft('frozen'); search.dispose(); const frozen = search.getState(); search.reset(); assert.deepEqual(search.getState(), frozen);
});
