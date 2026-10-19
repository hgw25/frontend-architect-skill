export function createSearch(fetchUsers) {
  const state = {
    draft: '',
    submitted: '',
    status: 'idle',
    items: [],
    error: null,
  };
  let latestRequestId = 0;
  let disposed = false;

  function isCurrent(requestId) {
    return !disposed && requestId === latestRequestId;
  }

  async function run(query) {
    if (disposed) return;

    const requestId = ++latestRequestId;
    state.status = 'loading';
    state.error = null;

    try {
      const users = await fetchUsers(query);
      if (!isCurrent(requestId)) return;

      state.items = users.map(({ user_id, display_name }) => ({
        id: user_id,
        label: display_name,
      }));
      state.status = 'success';
    } catch (error) {
      if (!isCurrent(requestId)) return;

      state.error = error instanceof Error ? error.message : String(error);
      state.status = 'error';
    }
  }

  async function submit() {
    if (disposed) return;

    const query = state.draft.trim();
    if (!query) return;

    state.submitted = query;
    await run(query);
  }

  async function retry() {
    if (disposed || !state.submitted) return;
    await run(state.submitted);
  }

  return {
    setDraft(value) {
      if (!disposed) state.draft = value;
    },
    submit,
    retry,
    getState() {
      return {
        ...state,
        items: state.items.map(item => ({ ...item })),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
    },
  };
}
