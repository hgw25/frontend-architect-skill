import { createFeedController } from './controllers/feed.mjs';
import { createDraftController } from './controllers/draft.mjs';
import { createPublishController } from './controllers/publish.mjs';
import { createCreatorDirectory } from './controllers/creator-directory.mjs';
import { createFavorites } from './controllers/favorites.mjs';
import { createCategories } from './controllers/categories.mjs';
import { onForeground } from './lifecycle.mjs';

export function createCommunity(api, categoryLabels) {
  const feed = createFeedController(api);
  const draft = createDraftController();
  const publish = createPublishController(api, draft);
  const creatorDirectory = createCreatorDirectory(api);
  const favorites = createFavorites();
  const categories = createCategories(categoryLabels);
  const resources = { feed, draft, publish, creatorDirectory, favorites, categories };
  return {
    ...resources,
    onForeground: () => onForeground(resources),
    dispose() { feed.dispose(); creatorDirectory.dispose(); },
  };
}
