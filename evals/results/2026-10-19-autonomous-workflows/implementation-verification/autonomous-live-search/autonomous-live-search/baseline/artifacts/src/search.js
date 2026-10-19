export function createSearch(fetchUsers) {
  let state = {
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

  function errorMessage(error) {
    if (error != null && typeof error.message === 'string') {
      return error.message;
    }
    return String(error);
  }

  async function request(query) {
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

      state.error = errorMessage(error);
      state.status = 'error';
    }
  }

  async function submit() {
    if (disposed) return;

    const query = state.draft.trim();
    if (query === '') return;

    state.submitted = query;
    await request(query);
  }

  async function retry() {
    if (disposed || state.submitted === '') return;
    await request(state.submitted);
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
      latestRequestId += 1;
    },
  };
}
