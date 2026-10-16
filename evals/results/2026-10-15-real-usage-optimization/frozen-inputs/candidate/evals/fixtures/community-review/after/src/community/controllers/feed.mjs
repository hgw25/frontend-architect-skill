export function createFeedController(api) {
  let generation = 0;
  let query = { title: '', status: 'published' };
  let snapshot = { items: [], cursor: null, loading: false, loadingMore: false, error: null };

  async function load(replace) {
    if (!replace && (snapshot.loading || snapshot.loadingMore || !snapshot.cursor)) return;
    const request = replace ? ++generation : generation;
    const submitted = { ...query, cursor: replace ? null : snapshot.cursor };
    snapshot = { ...snapshot, error: null,
      loading: replace, loadingMore: !replace };
    try {
      const page = await api.list(submitted);
      if (request !== generation) return;
      snapshot = { ...snapshot,
        items: replace ? page.items : [...snapshot.items, ...page.items], cursor: page.cursor };
    } catch (error) {
      if (request === generation) snapshot = { ...snapshot, error };
    } finally {
      if (request === generation) snapshot = { ...snapshot, loading: false, loadingMore: false };
    }
  }

  return {
    get snapshot() { return snapshot; },
    search(next) { query = { ...next }; return load(true); },
    refresh() { return load(true); },
    loadMore() { return load(false); },
    dispose() { generation++; },
  };
}
