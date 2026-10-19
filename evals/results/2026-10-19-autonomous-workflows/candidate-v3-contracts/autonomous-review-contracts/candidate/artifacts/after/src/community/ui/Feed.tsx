import { PostRow } from './PostRow';
import type { Post, Commands } from '../types';

type Props = { items: Post[]; loading: boolean; loadingMore: boolean; error: Error | null;
  cursor: string | null; commands: Commands; favorites: { has: (id: string) => boolean };
  locale: string; labels: { get: string; owned: string; favorite: string;
    loading: string; empty: string; retry: string; more: string; title: string };
  refresh: () => void; loadMore: () => void };

export function Feed(props: Props) {
  return <section aria-label={props.labels.title} className="community-feed">
    {props.loading && <p role="status">{props.labels.loading}</p>}
    {props.error && <div role="alert"><p>{props.error.message}</p>
      <button onClick={props.refresh}>{props.labels.retry}</button></div>}
    {!props.loading && !props.error && props.items.length === 0 && <p>{props.labels.empty}</p>}
    {props.items.map(post => <PostRow key={post.id} post={post} commands={props.commands}
      favorite={props.favorites.has(post.id)} locale={props.locale} labels={props.labels} />)}
    {props.cursor && <button disabled={props.loading || props.loadingMore} onClick={props.loadMore}>
      {props.loadingMore ? props.labels.loading : props.labels.more}
    </button>}
  </section>;
}
