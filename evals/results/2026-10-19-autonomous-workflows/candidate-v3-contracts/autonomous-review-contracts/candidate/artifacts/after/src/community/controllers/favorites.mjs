export function createFavorites() {
  const selected = new Set();
  return {
    has(postId) { return selected.has(postId); },
    toggle(postId) {
      if (selected.has(postId)) selected.delete(postId);
      else selected.add(postId);
    },
  };
}
