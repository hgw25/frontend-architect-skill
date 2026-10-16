import { createFeedController } from './controllers/feed.mjs';
import { createDraftController } from './controllers/draft.mjs';
import { createPublishController } from './controllers/publish.mjs';
import { onForeground } from './lifecycle.mjs';

export function createCommunity(api) {
  const feed = createFeedController(api);
  const draft = createDraftController();
  const publish = createPublishController(api, draft);
  const resources = { feed, draft, publish };
  return { ...resources, onForeground: () => onForeground(resources) };
}
