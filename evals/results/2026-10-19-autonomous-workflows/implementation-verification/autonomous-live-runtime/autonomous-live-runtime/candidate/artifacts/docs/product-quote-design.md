# Product quote and purchase flow

## Outcome and inspected contracts

The authenticated user can open `GET /products/sku1`, see a locale-formatted,
user-specific quote, and buy through `POST /api/buy`. Buyers can purchase;
viewers can read the quote but the UI and server both deny purchase. The page is
usable without JavaScript, while `src/app.mjs` enhances submission with pending,
success, and failure feedback.

`server/platform.mjs` is authoritative for sessions, permission, quote expiry,
purchase execution, the clock, and safe description formatting. Quote cache
identity is `(tenantId, userId, sku)`. Browser fields and query parameters never
alter identity or permission. Only display fields cross the server/browser
boundary; service tokens, internal costs, and upstream error details remain on
the server. Supported price locales are `en-US` and `fr-FR`, falling back to
`en-US`.

## Three dependency-ordered implementation steps

1. **Quote read and rendering.** `createApp()` owns a per-application quote cache,
   resolves the session, loads an unexpired quote, maps it to the public view,
   and renders semantic HTML with the platform sanitizer and `Intl.NumberFormat`.
   Completion: identity, locale, expiry, safe markup, private-field, and upstream
   failure server checks pass.
2. **Authorized purchase and invalidation.** The `/api/buy` branch checks
   `canBuy(session)` on the server, executes the fixed-route SKU, invalidates only
   that session's cache entry, and returns JSON to enhanced callers or a refreshed
   HTML result to native form callers. Completion: viewer denial, user-scoped
   invalidation, and native no-script purchase checks pass.
3. **Browser enhancement and presentation.** The page links a responsive style
   sheet and a small enhancement that guards repeated activation, preserves the
   native fallback, and publishes accessible success/failure feedback. Completion:
   Playwright verifies buyer feedback, viewer state, safe content, and the
   JavaScript-disabled flow.

## Code contracts and ownership

- `createApp(services) -> (req, res) => Promise<void>` is the composition root.
  Its closure owns quote cache lifetime; injected services remain the authority
  for identity, permission, time, safe rich text, quote retrieval, and purchase.
- `getCachedQuote(sku, session) -> Promise<Quote>` derives a complete cache key,
  reuses a quote only while `validUntil > services.now()`, and otherwise replaces
  it from the upstream service. A rejected load is never cached.
- `toQuoteView(quote, locale) -> QuoteView` is the server-to-browser allowlist:
  escaped name, formatted price, sanitized description, and SKU only.
- `renderProductPage(view, options) -> string` owns the semantic document. It
  exposes native form behavior, a disabled viewer control, and a live status
  region; it does not own authorization.
- `handlePurchase` owns the mutation sequence: authorize, purchase, invalidate,
  then acknowledge. It refreshes the display quote when available without making
  an already-confirmed purchase depend on that read. JSON failures are stable
  public messages/status codes; native failures render an actionable page without
  private details.
- `src/app.mjs` owns only progressive enhancement state for one form submission.
  While pending it disables repeated activation; success or current failure is
  announced in the existing status region. Server authorization remains final.

## Technical architecture

```text
[Browser: semantic product page]
       | GET /products/sku1, POST /api/buy
       v
[server/app.mjs: routing + HTML/JSON boundary]
       | readSession / canBuy / now
       | getQuote / purchase / descriptionHtml
       v
[server/platform.mjs: identity, policy, domain services]

[Browser: src/app.mjs] --enhances--> [native purchase form]
[Browser]              --loads----> [src/style.css]
```

Dependencies point from the application boundary to the injected platform
contract. The client receives no platform module or privileged service data.

## Data flow

```text
GET /products/sku1?lang=fr-FR + session cookie
  -> readSession(req)
  -> cache key tenantId:userId:sku
  -> cached valid quote OR getQuote(sku, session)
     -> upstream failure -> 502 public unavailable page
  -> allowlisted QuoteView + locale currency formatting + descriptionHtml()
  -> semantic HTML response

Buy activation
  -> native form POST (or enhanced fetch with Accept: application/json)
  -> readSession(req) -> canBuy(session)
     -> false -> 403 public denial
  -> purchase(fixed sku, session)
     -> failure -> 502 public failure feedback
  -> delete only tenantId:userId:sku cache entry
  -> JSON success announcement + refreshed price when available (enhanced)
     OR reload quote and render accepted status (native)
```

## Verification and evolution

The existing Node tests cover cache identity/expiry, server authorization,
invalidation, data minimization, sanitization, and upstream errors. The existing
Playwright checks cover localized server rendering, the no-script purchase,
viewer denial, and enhanced accessible feedback. Added checks should target any
newly discovered branch rather than implementation details.

Executed on 2026-10-19:

- `node --test test/app-handler.test.mjs`: 4/4 passed using the real application
  handler without a network listener.
- `node --check server/app.mjs`, `node --check src/app.mjs`, and
  `git diff --check`: passed.
- `node --test test/server.test.mjs` and `npm run check`: attempted, but this
  evaluation sandbox rejects the harnesses' `127.0.0.1` listener with `EPERM`.
  Browser-runtime acceptance therefore remains unexecuted here.

A realistic follow-up is adding another product route. The fixed supported-route
mapping can then resolve a trusted SKU from the pathname while cache, rendering,
authorization, and invalidation retain their current contracts; no generic catalog
router is needed for today's single-product scope.
