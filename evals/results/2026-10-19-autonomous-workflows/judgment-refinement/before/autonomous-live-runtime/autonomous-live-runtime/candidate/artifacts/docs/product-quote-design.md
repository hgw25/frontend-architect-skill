# Product quote and purchase design

## Outcome and established contracts

The `/products/sku1` experience shows the signed-in user's current quote and lets
authorized buyers purchase that product. The repository's `platform.mjs` is the
authority for sessions, buyer permission, time, quote retrieval, purchase effects,
and the allowed rich-description formatting. Browser-supplied query/form values
never select an identity, price, or permission.

Acceptance requires:

- unauthenticated quote and purchase requests return 401;
- quote caching is scoped by tenant, user, and SKU, expires at `validUntil`, and is
  invalidated only for the purchasing identity after a successful mutation;
- viewers receive the quote but a disabled purchase control, while the server
  independently rejects their mutation with 403;
- only `sku`, `name`, `price`, `currency`, formatted description, and expiry data
  needed by the page may cross the server/browser boundary; upstream failures are
  a public 502 response without private details;
- `en-US` and `fr-FR` currency output use `Intl.NumberFormat`; the product and a
  native purchase form remain usable without JavaScript;
- JavaScript adds pending, success, and failure feedback, prevents repeat local
  activation while pending, and preserves the authoritative server outcome.

No framework is warranted for this single page. Semantic server-rendered HTML is
the resilient baseline; a small browser module owns only purchase enhancement.

## Dependency-ordered implementation (3 steps)

1. **Authoritative quote page and cache.** `server/app.mjs` owns request routing and
   an app-instance `Map` keyed by tenant/user/SKU. `getCurrentQuote(sku, session)`
   reuses an unexpired entry or asks the platform. Rendering projects the quote to
   public fields, formats currency for the selected supported locale, escapes text,
   and passes descriptions through `services.descriptionHtml`. Completion: server
   tests prove identity/expiry isolation, safe output, and honest upstream failure.
2. **Authorized purchase and reconciliation.** `handlePurchase(session, request)`
   checks `services.canBuy` before calling `services.purchase`, invalidates that
   identity's cache entry only after success, and obtains the refreshed quote.
   JSON callers receive a minimal display result; native form callers receive the
   same page with a visible success message. Completion: buyer, viewer, anonymous,
   invalidation, and no-JavaScript paths pass.
3. **Progressive interface.** Server markup and `src/style.css` provide a responsive
   product/quote composition, visible focus, native disabled semantics, and a live
   status region. `src/app.mjs` guards a pending submission, disables its button,
   publishes only that command's result, updates the displayed confirmed price,
   and restores the button after settlement. Completion: browser tests cover safe content,
   viewer state, native purchase, and enhanced accessible feedback at narrow and
   standard viewports.

## Code contracts and ownership

- `createApp(services) -> requestHandler` retains the established injectable
  platform boundary. The handler owns HTTP status/content negotiation and one
  cache whose lifetime matches the app instance.
- `getCurrentQuote(sku, session) -> Promise<Quote>` owns cache freshness for the
  server-side platform record. Cache identity is derived only from the trusted
  session and server-selected SKU; public projection happens only while rendering.
- `renderProductPage({ quote, locale, canBuy, status }) -> string` is a pure output
  boundary. Text goes through `escapeHtml`; the description uses the existing
  allowlist formatter. It never serializes the upstream record wholesale.
- The browser submit listener owns one form's pending UI. Repeated activation is a
  no-op while pending. A failed or non-JSON response becomes actionable visible
  feedback; the server remains authoritative and no optimistic purchase is shown.

```text
Browser
  | GET /products/sku1, POST /api/buy
  v
createApp request handler (server/app.mjs)
  |-- readSession / canBuy ----------------------> platform.mjs
  |-- getCurrentQuote --> identity quote cache --> platform.getQuote
  |-- purchase ----------------------------------> platform.purchase
  `-- renderProductPage --> safe HTML + public fields
             |
             v
        Product page
             `-- enhanced submit (src/app.mjs) --> same POST endpoint
                    styles (src/style.css)
```

## Representative data flow

```text
Trusted session cookie -> readSession -> session {tenantId, userId, role}
  | missing -----------------------------------------------> 401
  v
GET product -> cache key(tenant, user, sku) -> cached & unexpired? -- yes --> quote
                                             | no
                                             v
                                      platform.getQuote
                                             | rejection --> public 502
                                             v
quote -> public-field projection + descriptionHtml + locale currency -> HTML

Buy activation -> POST /api/buy -> readSession -> canBuy
  | false -------------------------------------------------> 403 + visible failure
  v
platform.purchase -> success -> delete current identity cache -> refreshed quote
  | rejection --------------------------------------------> 502 + visible failure
  v
JSON enhancement: displayPrice -> status/price update
native form: rendered product page -> status announcement
```

## Verification and evolution

Executed evidence:

- `node --test test/server.test.mjs`: 4/4 passed (identity/expiry cache scope,
  authorization and invalidation, safe public output, upstream failure handling).
- `npm run check`: 5/5 passed in Chromium, including the three provided runtime
  scenarios plus pending deduplication/refreshed price and French narrow-layout
  coverage in `tests/product-quote.spec.mjs`.
- `node --check server/app.mjs`, `node --check src/app.mjs`, and `git diff --check`
  completed without errors. The Playwright failure screenshot produced while
  diagnosing test-state interference was also inspected at the real 1100×760
  runtime; the final failing condition was removed and the full suite rerun.

A realistic next change is adding another SKU. The cache key and page renderer
already accept a server-selected SKU, while route recognition remains the explicit
place to decide which catalog items exist; no generic catalog framework is needed.
If purchases later gain an idempotency key or authoritative order state, extend the
platform contract and reconciliation response rather than treating a client button
guard as duplicate-purchase protection.

All three implementation steps are complete. No deployment or non-Chromium browser
claim is made by these local checks.
