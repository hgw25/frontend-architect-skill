export function createPublishController(api, draft) {
  let pending = false;
  let error = null;
  return {
    get snapshot() { return { pending, error }; },
    async submit() {
      if (pending) return;
      pending = true;
      error = null;
      try { await api.publish({ title: draft.title }); }
      catch (cause) { error = cause; }
      finally { pending = false; }
    },
  };
}
