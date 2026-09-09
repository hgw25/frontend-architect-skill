export function createSearch(fetchUsers) {
  const state = { draft: '', submitted: '', status: 'idle', items: [], error: null };
  let latestRequest = 0;
  let disposed = false;

  async function request(query) {
    if (disposed || !query) return;

    const requestId = ++latestRequest;
    state.submitted = query;
    state.status = 'loading';
    state.error = null;

    try {
      const users = await fetchUsers(query);
      if (disposed || requestId !== latestRequest) return;
      state.items = users.map(user => ({ id: user.user_id, label: user.display_name }));
      state.status = 'success';
    } catch (error) {
      if (disposed || requestId !== latestRequest) return;
      state.error = error instanceof Error ? error.message : String(error);
      state.status = 'error';
    }
  }

  return {
    setDraft(value) {
      if (!disposed) state.draft = value;
    },
    async submit() {
      if (disposed) return;
      await request(state.draft.trim());
    },
    async retry() {
      await request(state.submitted);
    },
    getState() {
      return structuredClone(state);
    },
    dispose() {
      disposed = true;
    },
  };
}
