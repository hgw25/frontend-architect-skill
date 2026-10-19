export function createLedger() {
  const messages = new Map();
  const requests = [];
  const key = (scope, id) => JSON.stringify([scope, id]);

  function mergeProgress(input) {
    const matches = requests.filter((request) => request.scope === input.scope &&
      ((input.userId !== undefined && request.userId === input.userId) ||
       (input.agentId !== undefined && request.agentId === input.agentId)));
    const merged = Object.assign({}, ...matches, input, {
      completed: input.completed || matches.some((request) => request.completed),
    });
    for (const request of matches) requests.splice(requests.indexOf(request), 1);
    requests.push(merged);
  }

  return {
    accept(scope, userId) { mergeProgress({ scope, userId, completed: false }); },
    restoreMessage(message) { messages.set(key(message.scope, message.id), { ...message }); },
    receive(snapshot) {
      const previous = messages.get(key(snapshot.scope, snapshot.id));
      const stored = { ...previous, ...snapshot };
      messages.set(key(stored.scope, stored.id), stored);
      mergeProgress({
        scope: stored.scope,
        userId: stored.replyTo,
        agentId: stored.id,
        completed: stored.status === 'done' || stored.status === 'error',
      });
    },
    recover(history) { for (const message of history) this.receive(message); },
    waiting(scope) { return requests.filter((request) => request.scope === scope &&
      request.userId !== undefined && !request.completed).map((request) => request.userId); },
    inspect() { return requests.map((request) => ({ ...request })); },
  };
}
