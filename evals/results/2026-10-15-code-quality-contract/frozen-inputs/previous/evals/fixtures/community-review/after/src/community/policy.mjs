export function canOpenDetail(post) {
  return Boolean(post.activityId) && post.status === 'published';
}

export function canAcquire(post) {
  return canOpenDetail(post) && !post.owned;
}
