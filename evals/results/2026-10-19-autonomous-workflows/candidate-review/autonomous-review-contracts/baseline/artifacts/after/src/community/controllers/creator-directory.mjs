export function createCreatorDirectory(api) {
  let generation = 0;
  let snapshot = { items: [], loading: false, error: null };
  return {
    get snapshot() { return snapshot; },
    async refresh() {
      const request = ++generation;
      snapshot = { ...snapshot, loading: true, error: null };
      try {
        const items = await api.creators();
        if (request === generation) snapshot = { ...snapshot, items };
      } catch (error) {
        if (request === generation) snapshot = { ...snapshot, error };
      } finally {
        if (request === generation) snapshot = { ...snapshot, loading: false };
      }
    },
    dispose() { generation++; },
  };
}
