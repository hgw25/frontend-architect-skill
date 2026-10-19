# Product and order filtering design

## Outcome and established contracts

The application has two filtering workflows backed by the existing
`queryProducts` and `queryOrders` functions. The URL is the authoritative applied
state and unrelated parameters must survive updates.

- Products start with published products, all categories, and no keyword. Form
  values are a draft: only submit/Apply publishes them to the URL and starts a
  query. Reset publishes the product defaults.
- Orders start with all statuses and the 30 calendar days ending on `today` from
  `data.mjs`. Complete, ordered dates and other edits publish immediately. An
  incomplete or reversed range stays editable, is associated with a visible
  error, and leaves the URL and displayed results unchanged. Reset publishes the
  order defaults.
- Reload and `popstate` rebuild the page and its controls from the URL. Product
  submissions create history entries. Live order edits replace the current entry
  so typing does not create one history item per character; following a page link
  still creates normal browser history.
- A current query failure is visible without representing failure as an empty
  result. Only the newest request may publish rows, counts, or errors.
- Native labelled controls, submit behavior, visible focus, wrapping layout, and
  a named Results list preserve keyboard, narrow-width, translation, and text-zoom
  behavior.

Query parameter contracts are page-prefixed (`p_q`, `p_category`, `p_status` and
`o_q`, `o_status`, `o_from`, `o_to`). Default values are omitted except that an
explicit empty product status represents “all statuses” because absence means the
published default. Unknown enumerated values fall back to their defaults; invalid
dates remain visible as the order draft but are never queried.

## Ordered implementation (3 steps)

1. **URL filter contracts.** Add pure parsing, serialization, defaults, and order
   date validation in `src/filters.mjs`. Inputs are a `URL`/draft object; outputs
   are normalized applied filters or a validation message. Completion: focused
   module tests cover defaults, preservation of unrelated parameters, explicit
   all-product-status, and the fixed 30-day range.
2. **Page composition and effects.** Replace the static page in `src/app.mjs`
   with product and order page builders using existing `ui.mjs` controls and
   query functions. The page owns editable form values; URL helpers own applied
   representation; a single request generation owns latest-result publication.
   Completion: browser flows demonstrate draft/apply, live valid orders, local
   invalid dates, URL restoration, reset, error presentation, and stale-response
   rejection.
3. **Responsive presentation and reconciliation.** Extend `src/style.css` so the
   filter surface wraps intrinsically and controls can shrink without page-level
   horizontal overflow. Reconcile this document with the implemented symbols and
   record executed checks. Completion: the repository Playwright suite passes,
   including keyboard submit and 200% text at 360 px.

## Code contracts and ownership

- `productFiltersFromUrl(url) -> ProductFilters` and
  `orderDraftFromUrl(url) -> OrderFilters` are the only URL readers.
- `urlWithProductFilters(url, filters) -> URL` and
  `urlWithOrderFilters(url, filters) -> URL` clone and update only owned keys;
  callers choose push versus replace history semantics.
- `validateOrderFilters(filters) -> string | null` owns the synchronous date
  invariant. `defaultOrderFilters()` derives its range from project `today`.
- `createProductPage()` and `createOrderPage()` compose product-specific controls
  and transitions. Shared DOM primitives remain in `ui.mjs`; product rules do not
  leak into a universal filter component.
- `createResults(query).run(filters)` in `app.mjs` snapshots the submitted filter
  and increments a request generation. Success and failure publish only when
  their generation is still current. Existing results remain visible on failure.
- `renderFromUrl()` owns route/history reconciliation and invalidates pending work
  before replacing the current page. Removed DOM owns no external subscriptions.

## Technical architecture

```text
Browser URL/history
      | parse on load/popstate             ^ push/replace owned keys
      v                                    |
src/filters.mjs (defaults, codecs, validation)
      | normalized applied filters / validation result
      v
src/app.mjs page owner -----------------> src/ui.mjs native primitives
      | stable filter snapshot                    |
      v                                           v
src/query.mjs existing async boundary       labelled form DOM
      | { rows, count } / Error                    ^
      v                                            |
latest-request publication ------------------------+
```

## Representative data flows

```text
Product input
  -> form draft only
  -> submit/Apply
  -> urlWithProductFilters(current URL, draft)
  -> history.pushState
  -> queryProducts(snapshot)
  -> [current generation] render rows + actual count
     [stale generation] discard success/error
     [current error] keep rows + publish alert

Order date edit
  -> read form draft
  -> validateOrderFilters
  -> [invalid] set aria-invalid + associated alert; URL/results unchanged
     [valid] clear validation -> history.replaceState
             -> queryOrders(snapshot)
             -> current result/error publication as above

Browser back/forward or reload
  -> renderFromUrl -> parse page-owned URL keys -> rebuild draft controls
  -> query normalized applied filters -> visible rows/count or current alert
```

## Verification, recovery, and evolution

The decisive check is `npm run check` at the browser boundary. Source-level
inspection additionally checks that all query completion branches use the same
generation guard, URL writes preserve unrelated parameters, and errors remain
owned by the active page. There is no persistence migration: URLs remain the
recovery mechanism and malformed/unknown values normalize to documented defaults.

A realistic next change is adding a product price range. It adds fields and codec
keys within the product filter contract and page builder without changing order
validation or async publication. If both pages later gain the *same semantic*
range policy, that demonstrated duplication is the point to extract a shared
field group; visual similarity alone is not.

## Delivery evidence

Implementation steps 1–3 are complete. `node --test
tests/filter-contracts.node.mjs` passes three URL/default/validation contract
checks; `node --check` passes for `src/app.mjs` and `src/filters.mjs`; and
`git diff --check` passes.

Browser acceptance remains environment-blocked rather than passed. `npm run check`
cannot start the configured server because this sandbox rejects binding
`127.0.0.1` with `EPERM`. The no-server browser harness in
`scripts/check-browser-without-server.mjs` also cannot launch Chromium because the
sandbox rejects its Mach service registration. Both commands remain reproducible
for an environment that permits those operations.
