import { canOpenDetail, canAcquire } from '../policy.mjs';

export function rowActions(post, commands) {
  return {
    detailHref: canOpenDetail(post) ? `/activities/${post.activityId}` : null,
    acquireDisabled: !canAcquire(post),
    acquire() { if (canAcquire(post)) commands.acquire(post.activityId); },
  };
}
