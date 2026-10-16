import { canOpenDetail, canAcquire } from '../policy.mjs';

export function rowActions(post, commands) {
  return {
    detailHref: canOpenDetail(post) ? `/activities/${post.activityId}` : null,
    acquireDisabled: post.owned || post.status !== 'published',
    acquire() { if (canAcquire(post)) commands.acquire(post.activityId); },
    toggleFavorite() { commands.toggleFavorite(post.id); },
  };
}
