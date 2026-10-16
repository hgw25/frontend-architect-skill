// Maintainer-only checks: never copied into the reviewer workspace or prompt.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const snapshot = path.resolve(process.argv[2]);
const load = relative => import(pathToFileURL(path.join(snapshot, relative)).href);
const { rowActions } = await load('src/community/ui/row-actions.mjs');
const { createCommunity } = await load('src/community/index.mjs');
const { createDraftController } = await load('src/community/controllers/draft.mjs');
const { createPublishController } = await load('src/community/controllers/publish.mjs');
const { createFeedController } = await load('src/community/controllers/feed.mjs');

const requests = [];
const feed = createFeedController({ async list(request) {
  requests.push(request);
  if (requests.length === 1) return { items: [{ id: 'a1' }], cursor: 'a-page2' };
  if (requests.length === 2) throw new Error('offline');
  return { items: [{ id: 'b2' }], cursor: null };
} });
await feed.search({ title: 'A', status: 'published' });
await feed.search({ title: 'B', status: 'published' });
await feed.loadMore();

const row = rowActions({ id: 'p1', activityId: null, status: 'published', owned: false }, {});
let feedRefreshes = 0, directoryRefreshes = 0;
const community = createCommunity({
  async list() { feedRefreshes++; return { items: [], cursor: null }; },
  async creators() { directoryRefreshes++; return []; },
  async publish() {},
}, [{ id: 'general', name: 'General' }]);
community.draft.editTitle('Unsaved');
community.favorites.toggle('p1');
await community.onForeground();

const draft = createDraftController({ title: 'Original', category: 'general' });
const payloads = [];
const publish = createPublishController({ async publish(payload) {
  payloads.push(payload);
  if (payloads.length === 1) throw new Error('offline');
} }, draft);
await publish.submit();
draft.editTitle('Edited');
draft.selectCategory('tools');
await publish.retry();
console.log(JSON.stringify({
  missingIdDisabled: row.acquireDisabled,
  missingIdHref: row.detailHref,
  feedRefreshes,
  directoryRefreshes,
  preservedDraft: community.draft.snapshot.title,
  preservedFavorite: community.favorites.has('p1'),
  retryUsesFailedPayload: JSON.stringify(payloads[1]) === JSON.stringify(payloads[0]),
  preservedEditedDraft: draft.snapshot.title,
  failedSearchBlocksOldPagination: requests.length === 2,
}));
