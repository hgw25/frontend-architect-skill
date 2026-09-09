export function createSearch(fetchUsers) {
  let state = { draft: '', submitted: '', status: 'idle', items: [], error: null };
  async function submit() {
    state.submitted = state.draft.trim();
    state.status = 'loading'; state.error = null;
    try {
      state.items = await fetchUsers(state.submitted);
      state.status = 'success';
    } catch (error) {
      state.error = error.message; state.status = 'error';
    } finally {
      if (state.status === 'loading') state.status = 'idle';
    }
  }
  return {
    setDraft(value) { state.draft = value; },
    submit,
    retry: submit,
    getState() { return structuredClone(state); },
    dispose() {},
  };
}
