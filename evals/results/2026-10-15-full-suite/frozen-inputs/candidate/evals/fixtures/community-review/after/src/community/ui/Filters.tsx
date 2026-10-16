import type { Query } from '../types';

export function Filters({ query, editTitle, selectStatus, search }: {
  query: Query; editTitle: (title: string) => void;
  selectStatus: (status: Query['status']) => void; search: () => void;
}) {
  return <form onSubmit={event => { event.preventDefault(); search(); }}>
    <label>Search<input value={query.title} onChange={event => editTitle(event.target.value)} /></label>
    <label>Status<select value={query.status} onChange={event => selectStatus(event.target.value as Query['status'])}>
      <option value="published">Published</option><option value="unavailable">Unavailable</option>
      <option value="all">All</option>
    </select></label>
    <button>Search</button>
  </form>;
}
