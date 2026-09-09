# Search request lifecycle implementation task

Repair `src/search.js` with its public `createSearch(fetchUsers)` export. No dependencies; run `npm run check`. Preserve package.json and test/. Focused source modules are allowed.

The returned object exposes setDraft(string), submit(): Promise<void>, retry(): Promise<void>, getState(), dispose(). getState returns an independent snapshot with exactly draft, submitted, status, items, error. Initial values: '', '', 'idle', [], null. Status is idle/loading/success/error. Draft editing never starts a request or changes submitted/results. submit trims and captures the current draft; each submit is a new request, including the same query. Blank submit is a no-op. A request begins with status loading, error null, and preserves last successful items while loading and on error.

fetchUsers(query) returns Promise<Array<{ user_id: string, display_name: string }>>. The only UI item shape is { id: string, label: string }; translate DTOs before publishing state. Inputs satisfy this DTO contract; no schema library is needed. Most recently STARTED request owns all result, error and status updates, whether older requests succeed or fail. Do not rely on transport cancellation; the injected function has no abort support. Request failures become status error with error.message (or String(error) for other thrown values), and submit/retry settle without throwing.

retry repeats the most recently submitted query even if draft changed; before any submission it is a no-op. dispose invalidates all pending work and freezes public state at that moment; future methods are no-ops and must not start requests. Snapshots must not allow mutation of live state. No UI framework, subscriptions, debounce, cache, or generalized request engine is required.
