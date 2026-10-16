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
