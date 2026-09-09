import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearch } from '../src/search.js';
const dto = (id, label) => ({ user_id: id, display_name: label });
function setup() {
  const requests = [];
  const search = createSearch(query => new Promise((resolve, reject) => requests.push({ query, resolve, reject })));
  return { search, requests };
}
async function seed(search, requests) {
  search.setDraft('seed'); const pending = search.submit(); requests.at(-1).resolve([dto('s', 'Seed')]); await pending;
}
test('draft submission and DTO boundary produce independent UI snapshots', async () => {
  const { search, requests } = setup();
  assert.deepEqual(search.getState(), { draft: '', submitted: '', status: 'idle', items: [], error: null });
  search.setDraft(' Ada '); assert.equal(requests.length, 0);
  const pending = search.submit(); assert.equal(requests[0].query, 'Ada');
  search.setDraft('Bob'); assert.equal(search.getState().submitted, 'Ada');
  requests[0].resolve([dto('1', 'Ada')]); await pending;
  assert.deepEqual(search.getState(), { draft: 'Bob', submitted: 'Ada', status: 'success', items: [{ id: '1', label: 'Ada' }], error: null });
  const snapshot = search.getState(); snapshot.items[0].label = 'mutated'; assert.equal(search.getState().items[0].label, 'Ada');
});
test('older success cannot finish the newer loading request or replace retained results', async () => {
  const { search, requests } = setup(); await seed(search, requests);
  search.setDraft('old'); const old = search.submit(); search.setDraft('new'); const latest = search.submit();
  requests[1].resolve([dto('o', 'Old')]); await old;
  assert.equal(search.getState().status, 'loading'); assert.deepEqual(search.getState().items, [{ id: 's', label: 'Seed' }]);
  requests[2].resolve([dto('n', 'New')]); await latest;
  assert.deepEqual(search.getState().items, [{ id: 'n', label: 'New' }]);
});
test('older failure and cleanup cannot clear newer loading state or publish error', async () => {
  const { search, requests } = setup();
  search.setDraft('old'); const old = search.submit(); search.setDraft('new'); const latest = search.submit();
  requests[0].reject(Error('old failure')); await old;
  assert.equal(search.getState().status, 'loading'); assert.equal(search.getState().error, null);
  requests[1].resolve([]); await latest; assert.equal(search.getState().status, 'success');
});
test('older success cannot overwrite latest failure', async () => {
  const { search, requests } = setup(); await seed(search, requests);
  search.setDraft('old'); const old = search.submit(); search.setDraft('new'); const latest = search.submit();
  requests[2].reject(Error('latest failed')); await latest; const failed = search.getState();
  assert.equal(failed.status, 'error'); assert.equal(failed.error, 'latest failed'); assert.deepEqual(failed.items, [{ id: 's', label: 'Seed' }]);
  requests[1].resolve([dto('o', 'Old')]); await old; assert.deepEqual(search.getState(), failed);
});
test('older failure cannot overwrite latest success, including repeated identical queries', async () => {
  const { search, requests } = setup(); search.setDraft('same'); const old = search.submit(); const latest = search.submit();
  requests[1].resolve([dto('n', 'New')]); await latest; const succeeded = search.getState();
  requests[0].reject(Error('stale')); await old; assert.deepEqual(search.getState(), succeeded);
});
test('retry uses submitted query and retains results until retry succeeds', async () => {
  const { search, requests } = setup(); await seed(search, requests);
  search.setDraft('submitted'); const failed = search.submit(); requests[1].reject('offline'); await failed;
  assert.equal(search.getState().error, 'offline');
  search.setDraft('unsent'); const retry = search.retry(); assert.equal(requests[2].query, 'submitted');
  assert.equal(search.getState().draft, 'unsent'); assert.equal(search.getState().error, null);
  assert.deepEqual(search.getState().items, [{ id: 's', label: 'Seed' }]);
  requests[2].resolve([]); await retry; assert.equal(search.getState().status, 'success');
});
test('empty submit and retry before any submit are no-ops', async () => {
  const { search, requests } = setup(); const retry = search.retry(); assert.equal(requests.length, 0); await retry; search.setDraft('   '); const blank = search.submit();
  assert.equal(requests.length, 0); await blank; assert.equal(search.getState().submitted, ''); assert.equal(search.getState().status, 'idle');
});
test('dispose freezes state against pending completion and future commands', async () => {
  const { search, requests } = setup(); search.setDraft('first'); const first = search.submit(); search.setDraft('second'); const second = search.submit();
  search.dispose(); const frozen = search.getState();
  search.setDraft('third'); const ignoredSubmit = search.submit(); const ignoredRetry = search.retry(); assert.equal(requests.length, 2); await ignoredSubmit; await ignoredRetry;
  requests[0].resolve([dto('x', 'X')]); requests[1].reject(Error('late')); await Promise.all([first, second]);
  assert.deepEqual(search.getState(), frozen); search.dispose(); assert.deepEqual(search.getState(), frozen);
});
