import { rowActions } from './row-actions.mjs';
import { formatCount, formatDate } from '../format.mjs';
import type { Post, Commands } from '../types';

type Props = { post: Post; commands: Commands; favorite: boolean;
  locale: string; labels: { get: string; owned: string; favorite: string } };

export function PostRow({ post, commands, favorite, locale, labels }: Props) {
  const actions = rowActions(post, commands);
  return <article className="community-row">
    <header className="community-heading">
      <h2 className="community-title">{actions.detailHref
        ? <a href={actions.detailHref}>{post.title}</a>
        : <span>{post.title}</span>}</h2>
      <span className="community-author">{post.creatorName}</span>
    </header>
    <p className="community-summary">{post.summary}</p>
    <ul className="community-tags" aria-label="Tags">
      {post.tags.map(tag => <li key={tag}>{tag}</li>)}
    </ul>
    <div className="community-meta">
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
      <span>{formatCount(post.downloads, locale)}</span>
    </div>
    <footer className="community-footer">
      <div className="community-participants">
        {post.participants.map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}
      </div>
      <div className="community-actions">
        <button type="button" aria-pressed={favorite} onClick={actions.toggleFavorite}>
          {labels.favorite}
        </button>
        <button type="button" disabled={actions.acquireDisabled} onClick={actions.acquire}>
          {post.owned ? labels.owned : labels.get}
        </button>
      </div>
    </footer>
  </article>;
}
