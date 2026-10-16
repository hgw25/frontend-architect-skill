const statuses = new Set(['published', 'unavailable', 'all']);
export function parseQuery(search) {
  const params = new URLSearchParams(search);
  const status = params.get('status');
  return { title: params.get('q') || '', status: statuses.has(status) ? status : 'published' };
}
export function writeQuery(search, query) {
  const params = new URLSearchParams(search);
  if (query.title) params.set('q', query.title); else params.delete('q');
  if (query.status === 'published') params.delete('status'); else params.set('status', query.status);
  return params.toString();
}
