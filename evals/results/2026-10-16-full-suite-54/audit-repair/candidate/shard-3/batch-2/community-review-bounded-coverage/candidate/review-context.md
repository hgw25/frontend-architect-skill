
FILE before/README.md
# Community workspace

Community pages let signed-in members discover releases, browse creators and
publish a new release. Product requirements live in docs/community.md.
Component interactions are owned in src/community/ui; data operations are in
src/community/controllers. Shared transport is injected at the page boundary.
Run `node --test test/*.test.mjs` for the fast checks.


FILE before/docs/checks.md
# Verification record

Fast structural and controller checks run with Node's test runner.
UI screenshots cover a published, unowned activity with a nonempty activity ID.
Layout and real browser event behavior require the host React application.


FILE before/docs/community.md
# Community requirements — revision 1

## Feed
Published entries link to their activity details. Acquiring an unowned activity
opens the acquisition workflow. A row with no activity ID keeps its title but
has neither a detail entry nor an enabled acquisition action.

## Creators
Creator names link to a creator detail page using the creator ID.

## Refresh
Refresh the feed when the application returns to the foreground. Local draft
text is preserved when navigating away and returning.


FILE before/src/community/api.mjs
export function createApi(request) {
  return {
    list: () => request('/community'),
    publish: payload => request('/community', { method: 'POST', body: payload }),
  };
}


FILE before/src/community/controllers/draft.mjs
export function createDraftController(initial = '') {
  let title = initial;
  return {
    get title() { return title; },
    edit(value) { title = value; },
  };
}


FILE before/src/community/controllers/feed.mjs
export function createFeedController(api) {
  let generation = 0;
  let snapshot = { items: [], loading: false, error: null };
  return {
    get snapshot() { return snapshot; },
    async refresh() {
      const request = ++generation;
      snapshot = { ...snapshot, loading: true, error: null };
      try {
        const items = await api.list();
        if (request === generation) snapshot = { ...snapshot, items };
      } catch (error) {
        if (request === generation) snapshot = { ...snapshot, error };
      } finally {
        if (request === generation) snapshot = { ...snapshot, loading: false };
      }
    },
    dispose() { generation++; },
  };
}


FILE before/src/community/controllers/publish.mjs
export function createPublishController(api, draft) {
  let pending = false;
  let error = null;
  return {
    get snapshot() { return { pending, error }; },
    async submit() {
      if (pending) return;
      pending = true;
      error = null;
      try { await api.publish({ title: draft.title }); }
      catch (cause) { error = cause; }
      finally { pending = false; }
    },
  };
}


FILE before/src/community/format.mjs
export function formatCount(count, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(count);
}


FILE before/src/community/index.mjs
import { createFeedController } from './controllers/feed.mjs';
import { createDraftController } from './controllers/draft.mjs';
import { createPublishController } from './controllers/publish.mjs';
import { onForeground } from './lifecycle.mjs';

export function createCommunity(api) {
  const feed = createFeedController(api);
  const draft = createDraftController();
  const publish = createPublishController(api, draft);
  const resources = { feed, draft, publish };
  return { ...resources, onForeground: () => onForeground(resources) };
}


FILE before/src/community/lifecycle.mjs
export function onForeground(resources) {
  return Promise.all([resources.feed.refresh()]);
}


FILE before/src/community/policy.mjs
export function canOpenDetail(post) {
  return Boolean(post.activityId) && post.status === 'published';
}

export function canAcquire(post) {
  return canOpenDetail(post) && !post.owned;
}


FILE before/src/community/routes.mjs
export const routes = [
  { path: '/community', page: 'feed' },
  { path: '/community/create', page: 'create' },
  { path: '/creators/:id', page: 'creator-detail' },
];


FILE before/src/community/types.ts
export type Post = {
  id: string;
  activityId: string | null;
  title: string;
  creatorId: string;
  creatorName: string;
  status: 'published' | 'unavailable';
  owned: boolean;
};

export type Commands = { acquire: (id: string) => void };


FILE before/src/community/ui/CreateForm.tsx
export function CreateForm({ title, pending, edit, submit }: {
  title: string; pending: boolean;
  edit: (value: string) => void; submit: () => void;
}) {
  return <form onSubmit={event => { event.preventDefault(); submit(); }}>
    <label>Title<input value={title} onChange={event => edit(event.target.value)} /></label>
    <button disabled={!title.trim() || pending}>Publish</button>
  </form>;
}


FILE before/src/community/ui/Feed.tsx
import { PostRow } from './PostRow';
import type { Post, Commands } from '../types';

export function Feed({ items, commands }: { items: Post[]; commands: Commands }) {
  return <section aria-label="Community">
    {items.map(post => <PostRow key={post.id} post={post} commands={commands} />)}
  </section>;
}


FILE before/src/community/ui/PostRow.tsx
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


FILE before/src/community/ui/community.css
.community-feed { display: grid; gap: 16px; }
.community-row { display: flex; flex-direction: column; gap: 8px; }
.community-title { font-weight: 600; }
.community-actions { display: flex; gap: 8px; }
.community-author { color: var(--text-secondary); }


FILE before/src/community/ui/row-actions.mjs
import { canOpenDetail, canAcquire } from '../policy.mjs';

export function rowActions(post, commands) {
  return {
    detailHref: canOpenDetail(post) ? `/activities/${post.activityId}` : null,
    acquireDisabled: !canAcquire(post),
    acquire() { if (canAcquire(post)) commands.acquire(post.activityId); },
  };
}


FILE after/README.md
# Community workspace

This review snapshot contains the community module extracted from a React host.
It includes controller tests and source, not an installed application or browser
harness. Do not infer browser verification from the Node tests.

The product brief is in docs/community.md. Accepted decisions are indexed in
docs/decisions/index.md; a dated accepted decision supersedes its named section
of the brief. Draft decisions are not requirements. The team implementation notes
in docs/release-notes.md describe intended delivery but are not acceptance tests.

Runtime entry: src/community/index.mjs. React host bindings provide controller
snapshots as props and subscribe to the host's foreground event. Local resources
belong to a workspace instance and are disposed when the workspace is closed.
Run `node --test test/*.test.mjs` for fast checks.


FILE after/docs/checks.md
# Verification record

Command: node --test test/*.test.mjs
Structural entry checks, feed request ordering, ordinary publish retry,
valid-ID acquisition, directory loading, favorites and formatting are covered.

## Flow-state register

| Flow | State | Recorded evidence |
| --- | --- | --- |
| Community | loading | feed.pending.test.mjs |
| Community | error | feed.pending.test.mjs |
| Community | empty | feed.pending.test.mjs |
| Community | success | row screenshot with a published release and activity ID |
| Community | disabled | CreateForm submit disabled with an empty title |
| Community | retry | publish.test.mjs retries without changing the draft |

Browser screenshots and keyboard testing live in the host repository, which is
not included in this review snapshot. These entries describe existing evidence.


FILE after/docs/community.md
# Community requirements — revision 2

## 1. Discovery
Users can search by title and filter by release status. The default list includes
published releases. Availability filters are encoded in shareable URLs. A new
query replaces the previous query, resets pagination and owns later responses.
Older requests must not replace a newer result, error or loading state.

## 2. Release rows
A release title is always visible. A missing activity ID means there is no
detail entry and the Get action is disabled. Unavailable releases also have
no detail entry or Get action. Owned releases remain readable, with Get disabled.
The same eligibility rule applies after filtering or refreshing the list.

## 3. Creator directory
Creators can be browsed from a separate directory. Names in release rows link
to a creator detail page using creator ID. See accepted decisions for revisions.
Directory display names, avatar URLs and summaries may change during a session.

## 4. Foreground recovery
Refresh the feed and creator directory when the workspace returns to foreground.
Local publish drafts and local favorites must survive recovery. Category labels
are immutable for this workspace session and do not need foreground refresh.

## 5. Publishing
A nonempty title is required. Capture the submitted title and category when a
publish command starts. Pending commands cannot be duplicated. A failed submit
offers Retry; retry repeats the failed submitted payload even if the user has
since edited the draft. An ordinary Submit uses the current draft instead.
Successful completion clears the error but does not discard a newer draft.

## 6. Favorites
Favoriting is local to a post ID, independent of acquisition eligibility. Missing
activity IDs and unavailable releases may still be favorited. It performs no
network mutation and does not require ownership of the underlying activity.

## 7. Presentation
Rows show creator identity, release summary, tags and optional participant names.
Empty lists, loading, partial loading and failures have explicit feedback.
Search and buttons remain keyboard usable; controls have accessible names.
Counts and dates follow the selected locale. Long titles wrap without clipping.

## 8. Packaging
This module integrates into the existing React application. Keep its transport
injectable and its data contracts local; do not add a second routing framework,
global store or generic request engine. Runtime browser verification is owned
by the host application and is separate from the fast controller tests here.


FILE after/docs/decisions/017-creator-navigation.md
# 017 — Creator navigation

Status: accepted. Date: 2026-09-12.
Supersedes: docs/community.md section 3, release-row creator links only.

The API does not expose a stable creator-to-account mapping. For this release,
render creator names in rows as plain text and remove the creator-detail route.
The creator directory remains available as a separate screen. Do not invent an
account ID from the creator ID. A later account-navigation contract needs a new
approved decision before links return.


FILE after/docs/decisions/018-local-favorites.md
# 018 — Local-only favorites

Status: accepted. Date: 2026-09-13.
Confirms: docs/community.md section 6.

Favorite toggles use post identity and remain enabled even when the activity
detail and acquisition actions are unavailable. They are workspace-local state,
not a server subscription. Foreground recovery must not clear them.


FILE after/docs/decisions/019-refresh-categories.md
# 019 — Refresh categories

Status: draft. Date: 2026-09-14.

Proposal: allow changing category labels without reopening a workspace.
This needs a versioned metadata endpoint. Until approved, categories remain
immutable for a workspace session as specified in the current brief.


FILE after/docs/decisions/index.md
# Community decisions

- Accepted: [017 — Creator navigation](017-creator-navigation.md)
- Accepted: [018 — Local-only favorites](018-local-favorites.md)
- Draft: [019 — Refresh categories](019-refresh-categories.md)

Only accepted decisions change the product brief. Drafts are discussion notes.


FILE after/docs/release-notes.md
# Community delivery notes

This change adds directory browsing, status filters, favorites, publish retries,
translated labels and denser row layout. Feed requests now use cursor pagination.
The feed controller has been checked for late results and loading cleanup.
Published-row screenshots were approved last iteration; the visual baseline uses
complete activity IDs. The structural suite is green and the flow-state register
is complete. Please review the full change against the current approved behavior.


FILE after/src/community/api.mjs
export function createApi(request) {
  return {
    list: query => {
      const params = new URLSearchParams({ q: query.title, status: query.status });
      if (query.cursor) params.set('cursor', query.cursor);
      return request(`/community?${params}`);
    },
    creators: () => request('/community/creators'),
    publish: payload => request('/community', { method: 'POST', body: payload }),
  };
}


FILE after/src/community/controllers/categories.mjs
export function createCategories(labels) {
  const snapshot = Object.freeze(labels.map(label => Object.freeze({ ...label })));
  return { get snapshot() { return snapshot; } };
}


FILE after/src/community/controllers/creator-directory.mjs
export function createCreatorDirectory(api) {
  let generation = 0;
  let snapshot = { items: [], loading: false, error: null };
  return {
    get snapshot() { return snapshot; },
    async refresh() {
      const request = ++generation;
      snapshot = { ...snapshot, loading: true, error: null };
      try {
        const items = await api.creators();
        if (request === generation) snapshot = { ...snapshot, items };
      } catch (error) {
        if (request === generation) snapshot = { ...snapshot, error };
      } finally {
        if (request === generation) snapshot = { ...snapshot, loading: false };
      }
    },
    dispose() { generation++; },
  };
}


FILE after/src/community/controllers/draft.mjs
export function createDraftController(initial = { title: '', category: 'general' }) {
  let value = { ...initial };
  return {
    get snapshot() { return { ...value }; },
    editTitle(title) { value = { ...value, title }; },
    selectCategory(category) { value = { ...value, category }; },
  };
}


FILE after/src/community/controllers/favorites.mjs
export function createFavorites() {
  const selected = new Set();
  return {
    has(postId) { return selected.has(postId); },
    toggle(postId) {
      if (selected.has(postId)) selected.delete(postId);
      else selected.add(postId);
    },
  };
}


FILE after/src/community/controllers/feed.mjs
export function createFeedController(api) {
  let generation = 0;
  let query = { title: '', status: 'published' };
  let snapshot = { items: [], cursor: null, loading: false, loadingMore: false, error: null };

  async function load(replace) {
    if (!replace && (snapshot.loading || snapshot.loadingMore || !snapshot.cursor)) return;
    const request = replace ? ++generation : generation;
    const submitted = { ...query, cursor: replace ? null : snapshot.cursor };
    snapshot = { ...snapshot, error: null,
      loading: replace, loadingMore: !replace };
    try {
      const page = await api.list(submitted);
      if (request !== generation) return;
      snapshot = { ...snapshot,
        items: replace ? page.items : [...snapshot.items, ...page.items], cursor: page.cursor };
    } catch (error) {
      if (request === generation) snapshot = { ...snapshot, error };
    } finally {
      if (request === generation) snapshot = { ...snapshot, loading: false, loadingMore: false };
    }
  }

  return {
    get snapshot() { return snapshot; },
    search(next) { query = { ...next }; return load(true); },
    refresh() { return load(true); },
    loadMore() { return load(false); },
    dispose() { generation++; },
  };
}


FILE after/src/community/controllers/publish.mjs
export function createPublishController(api, draft) {
  let pending = false;
  let error = null;
  let failedPayload = null;

  async function send(payload) {
    if (pending) return;
    pending = true;
    error = null;
    try {
      await api.publish(payload);
      failedPayload = null;
    } catch (cause) {
      failedPayload = payload;
      error = cause;
    } finally {
      pending = false;
    }
  }

  return {
    get snapshot() { return { pending, error, canRetry: failedPayload !== null }; },
    submit() { return send(draft.snapshot); },
    retry() {
      if (failedPayload === null) return;
      return send(draft.snapshot);
    },
  };
}


FILE after/src/community/format.mjs
export function formatCount(count, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(count);
}
export function formatDate(value, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}


FILE after/src/community/index.mjs
import { createFeedController } from './controllers/feed.mjs';
import { createDraftController } from './controllers/draft.mjs';
import { createPublishController } from './controllers/publish.mjs';
import { createCreatorDirectory } from './controllers/creator-directory.mjs';
import { createFavorites } from './controllers/favorites.mjs';
import { createCategories } from './controllers/categories.mjs';
import { onForeground } from './lifecycle.mjs';

export function createCommunity(api, categoryLabels) {
  const feed = createFeedController(api);
  const draft = createDraftController();
  const publish = createPublishController(api, draft);
  const creatorDirectory = createCreatorDirectory(api);
  const favorites = createFavorites();
  const categories = createCategories(categoryLabels);
  const resources = { feed, draft, publish, creatorDirectory, favorites, categories };
  return {
    ...resources,
    onForeground: () => onForeground(resources),
    dispose() { feed.dispose(); creatorDirectory.dispose(); },
  };
}


FILE after/src/community/lifecycle.mjs
export function onForeground(resources) {
  return Promise.all([resources.feed.refresh()]);
}


FILE after/src/community/policy.mjs
export function canOpenDetail(post) {
  return Boolean(post.activityId) && post.status === 'published';
}

export function canAcquire(post) {
  return canOpenDetail(post) && !post.owned;
}


FILE after/src/community/query.mjs
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


FILE after/src/community/routes.mjs
export const routes = [
  { path: '/community', page: 'feed' },
  { path: '/community/create', page: 'create' },
  { path: '/community/creators', page: 'creator-directory' },
];


FILE after/src/community/types.ts
export type Availability = 'published' | 'unavailable';
export type Post = {
  id: string;
  activityId: string | null;
  title: string;
  summary: string;
  creatorId: string;
  creatorName: string;
  status: Availability;
  owned: boolean;
  tags: string[];
  participants: string[];
  publishedAt: string;
  downloads: number;
};
export type Creator = { id: string; name: string; avatarUrl: string | null; summary: string };
export type Query = { title: string; status: Availability | 'all' };
export type Commands = {
  acquire: (id: string) => void;
  toggleFavorite: (postId: string) => void;
};
export type Page<T> = { items: T[]; cursor: string | null };


FILE after/src/community/ui/CreateForm.tsx
type Props = { title: string; category: string; pending: boolean; error: Error | null;
  canRetry: boolean; categories: readonly { id: string; name: string }[];
  edit: (value: string) => void; selectCategory: (value: string) => void;
  submit: () => void; retry: () => void };

export function CreateForm(props: Props) {
  return <form onSubmit={event => { event.preventDefault(); props.submit(); }}>
    <label>Title<input value={props.title} onChange={event => props.edit(event.target.value)} /></label>
    <label>Category<select value={props.category} onChange={event => props.selectCategory(event.target.value)}>
      {props.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
    <button disabled={!props.title.trim() || props.pending}>Publish</button>
    {props.error && <div role="alert">
      <p>{props.error.message}</p>
      {props.canRetry && <button type="button" disabled={props.pending} onClick={props.retry}>Retry</button>}
    </div>}
  </form>;
}


FILE after/src/community/ui/CreatorDirectory.tsx
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


FILE after/src/community/ui/Feed.tsx
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


FILE after/src/community/ui/Filters.tsx
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


FILE after/src/community/ui/PostRow.tsx
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


FILE after/src/community/ui/community.css
.community-feed {
  display: grid;
  gap: var(--space-4, 16px);
  max-inline-size: 72rem;
  margin-inline: auto;
}
.community-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-medium, 12px);
  min-inline-size: 0;
}
.community-heading { display: flex; flex-direction: column; gap: 4px; }
.community-title { margin: 0; font-size: 1.125rem; overflow-wrap: anywhere; }
.community-title a { color: inherit; text-decoration-thickness: 1px; }
.community-author { color: var(--text-secondary); font-size: .875rem; }
.community-summary { margin: 0; overflow-wrap: anywhere; }
.community-tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; list-style: none; }
.community-tags li { padding: 2px 8px; background: var(--surface-muted); border-radius: 6px; }
.community-meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--text-secondary); }
.community-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.community-participants { display: flex; flex-wrap: wrap; gap: 4px; }
.community-actions { display: flex; gap: 8px; margin-inline-start: auto; }
.community-actions button { min-block-size: 40px; padding-inline: 12px; }
.community-actions button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.creator-directory { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: 16px; }
.creator-directory li { list-style: none; padding: 16px; border: 1px solid var(--border-subtle); }
.creator-directory img { border-radius: 50%; object-fit: cover; }
@media (max-width: 36rem) {
  .community-row { padding: 12px; }
  .community-actions { inline-size: 100%; justify-content: flex-end; }
}


FILE after/src/community/ui/row-actions.mjs
import { canOpenDetail, canAcquire } from '../policy.mjs';

export function rowActions(post, commands) {
  return {
    detailHref: canOpenDetail(post) ? `/activities/${post.activityId}` : null,
    acquireDisabled: post.owned || post.status !== 'published',
    acquire() { if (canAcquire(post)) commands.acquire(post.activityId); },
    toggleFavorite() { commands.toggleFavorite(post.id); },
  };
}


FILE after/test/architecture.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunity } from '../src/community/index.mjs';
import { rowActions } from '../src/community/ui/row-actions.mjs';
import { routes } from '../src/community/routes.mjs';
test('entry points and routes are available', () => {
  assert.equal(typeof createCommunity, 'function');
  assert.equal(typeof rowActions, 'function');
  assert.ok(routes.some(route => route.page === 'feed'));
  assert.ok(routes.some(route => route.page === 'creator-directory'));
});


FILE after/test/directory.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCreatorDirectory } from '../src/community/controllers/creator-directory.mjs';
test('directory publishes creator results', async () => {
  const directory = createCreatorDirectory({ creators: async () => [{ id: 'c1', name: 'Ada' }] });
  await directory.refresh();
  assert.equal(directory.snapshot.items[0].name, 'Ada');
  assert.equal(directory.snapshot.loading, false);
});


FILE after/test/favorites.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFavorites } from '../src/community/controllers/favorites.mjs';
import { rowActions } from '../src/community/ui/row-actions.mjs';
test('local favorite uses post identity even without an activity', () => {
  const favorites = createFavorites();
  const actions = rowActions({ id: 'p1', activityId: null, status: 'unavailable', owned: false },
    { toggleFavorite: id => favorites.toggle(id) });
  actions.toggleFavorite();
  assert.equal(favorites.has('p1'), true);
});


FILE after/test/feed.pending.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeedController } from '../src/community/controllers/feed.mjs';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test('late error cannot clear a newer pending query', async () => {
  const a = deferred(), b = deferred();
  const queue = [a, b];
  const feed = createFeedController({ list: () => queue.shift().promise });
  const first = feed.search({ title: 'a', status: 'published' });
  const second = feed.search({ title: 'b', status: 'published' });
  a.reject(new Error('old error'));
  await first;
  assert.equal(feed.snapshot.loading, true);
  assert.equal(feed.snapshot.error, null);
  b.resolve({ items: [], cursor: null });
  await second;
  assert.equal(feed.snapshot.loading, false);
  assert.deepEqual(feed.snapshot.items, []);
});
test('pagination appends to current result', async () => {
  const pages = [{ items: [{ id: 'one' }], cursor: 'next' }, { items: [{ id: 'two' }], cursor: null }];
  const feed = createFeedController({ list: async () => pages.shift() });
  await feed.refresh();
  await feed.loadMore();
  assert.deepEqual(feed.snapshot.items.map(item => item.id), ['one', 'two']);
});


FILE after/test/format.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount, formatDate } from '../src/community/format.mjs';
import { parseQuery, writeQuery } from '../src/community/query.mjs';
test('formatting uses locale and fixed date timezone', () => {
  assert.equal(formatCount(12, 'en-US'), '12');
  assert.equal(formatDate('2026-09-01T23:00:00Z', 'en-US'), 'Sep 1, 2026');
});
test('query serializer preserves unrelated parameters', () => {
  assert.deepEqual(parseQuery('?q=tools&status=all'), { title: 'tools', status: 'all' });
  assert.equal(writeQuery('?utm=feed', { title: '', status: 'published' }), 'utm=feed');
});


FILE after/test/publish.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraftController } from '../src/community/controllers/draft.mjs';
import { createPublishController } from '../src/community/controllers/publish.mjs';
test('failed publish can be retried', async () => {
  const draft = createDraftController({ title: 'Release A', category: 'general' });
  let attempts = 0;
  const publish = createPublishController({ async publish() {
    if (++attempts === 1) throw new Error('network');
  } }, draft);
  await publish.submit();
  assert.equal(publish.snapshot.canRetry, true);
  await publish.retry();
  assert.equal(attempts, 2);
  assert.equal(publish.snapshot.error, null);
});


FILE after/test/row.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowActions } from '../src/community/ui/row-actions.mjs';
test('published unowned activity opens and can be acquired', () => {
  const calls = [];
  const actions = rowActions({ id: 'p1', activityId: 'a1', status: 'published', owned: false },
    { acquire: id => calls.push(id), toggleFavorite() {} });
  assert.equal(actions.detailHref, '/activities/a1');
  assert.equal(actions.acquireDisabled, false);
  actions.acquire();
  assert.deepEqual(calls, ['a1']);
});
test('owned activity remains readable', () => {
  const actions = rowActions({ id: 'p1', activityId: 'a1', status: 'published', owned: true }, {});
  assert.equal(actions.detailHref, '/activities/a1');
  assert.equal(actions.acquireDisabled, true);
});
