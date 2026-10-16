export function createPublishController(api, draft) {
  let pending = false;
  let error = null;
  let failedPayload = null;

  async function send(payload) {
    if (pending) return;
    pending = true;
    error = null;
    try {
      await api.publish(payload);
      failedPayload = null;
    } catch (cause) {
      failedPayload = payload;
      error = cause;
    } finally {
      pending = false;
    }
  }

  return {
    get snapshot() { return { pending, error, canRetry: failedPayload !== null }; },
    submit() { return send(draft.snapshot); },
    retry() {
      if (failedPayload === null) return;
      return send(draft.snapshot);
    },
  };
}
