/**
 * load(query) returns a promise of normalized UI items. publish observes complete
 * {status, query, ...} states synchronously and must not throw. Loading replaces
 * prior results in this example; retaining stale results needs their identity too.
 */
export function createLatestSearch(load, publish) {
  let generation = 0;
  let disposed = false;

  async function submit(query) {
    if (disposed) return;
    const request = ++generation;
    const isCurrent = () => !disposed && request === generation;
    publish({ status: 'loading', query });

    let items;
    try {
      items = await load(query);
    } catch (error) {
      if (isCurrent()) publish({ status: 'error', query, error });
      return;
    }
    if (isCurrent()) publish({ status: 'success', query, items });
  }

  function dispose() {
    disposed = true;
    generation += 1;
  }

  return { submit, dispose };
}
