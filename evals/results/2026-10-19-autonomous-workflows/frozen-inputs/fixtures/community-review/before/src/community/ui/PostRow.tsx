import { rowActions } from './row-actions.mjs';
import type { Post, Commands } from '../types';

export function PostRow({ post, commands }: { post: Post; commands: Commands }) {
  const actions = rowActions(post, commands);
  return <article>
    {actions.detailHref
      ? <a href={actions.detailHref}>{post.title}</a>
      : <span>{post.title}</span>}
    <a href={`/creators/${post.creatorId}`}>{post.creatorName}</a>
    <button disabled={actions.acquireDisabled} onClick={actions.acquire}>Get</button>
  </article>;
}
