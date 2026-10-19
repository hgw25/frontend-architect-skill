export function onForeground(resources) {
  return Promise.all([resources.feed.refresh()]);
}
