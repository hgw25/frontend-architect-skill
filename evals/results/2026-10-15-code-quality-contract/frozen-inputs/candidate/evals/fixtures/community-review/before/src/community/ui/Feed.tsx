import { PostRow } from './PostRow';
import type { Post, Commands } from '../types';

export function Feed({ items, commands }: { items: Post[]; commands: Commands }) {
  return <section aria-label="Community">
    {items.map(post => <PostRow key={post.id} post={post} commands={commands} />)}
  </section>;
}
