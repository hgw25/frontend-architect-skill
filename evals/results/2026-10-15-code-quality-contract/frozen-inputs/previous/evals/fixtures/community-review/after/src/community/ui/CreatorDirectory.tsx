import type { Creator } from '../types';

type Props = { items: Creator[]; loading: boolean; error: Error | null; refresh: () => void };
export function CreatorDirectory({ items, loading, error, refresh }: Props) {
  return <section aria-label="Creators">
    {loading && <p role="status">Loading creators</p>}
    {error && <div role="alert"><p>{error.message}</p><button onClick={refresh}>Retry</button></div>}
    {!loading && !error && items.length === 0 && <p>No creators yet</p>}
    <ul className="creator-directory">{items.map(creator => <li key={creator.id}>
      {creator.avatarUrl && <img src={creator.avatarUrl} alt="" width={40} height={40} />}
      <h2>{creator.name}</h2><p>{creator.summary}</p>
    </li>)}</ul>
  </section>;
}
