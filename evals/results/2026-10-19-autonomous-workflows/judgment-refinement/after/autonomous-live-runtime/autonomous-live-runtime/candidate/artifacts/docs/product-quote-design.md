# Product quote and purchase flow

## Outcome and existing contracts

The authenticated user can open `/products/sku1`, see a locale-formatted quote,
and, when their server-side role permits it, purchase the product. The page keeps
its readable content and native form behavior without JavaScript; `src/app.mjs`
only adds pending and result feedback.

The platform service is authoritative for sessions, buyer permission, quote data,
purchase execution, time, and the allowed `p`/`strong`/`em` description markup.
Browser query and form values are never authorization inputs. Only the product
fields needed for display cross into HTML; service tokens and internal cost remain
server-only. Supported price locales are `en-US` and `fr-FR`, with `en-US` as the
fallback. Upstream failures remain visible generic failures.

Acceptance requires identity-scoped, expiring quote reuse; invalidation of only
the purchasing user's quote; a disabled control for viewers plus authoritative
server rejection; safe rich description output; native and enhanced successful
purchase feedback; and no exposure of private data or errors.

## Three dependency-ordered implementation steps

1. **Own quote reads and presentation in the server application.**
   `createApp(services)` owns a cache keyed by tenant, user, and SKU. A GET reuses
   a quote only before `validUntil`, formats its price with `Intl.NumberFormat`,
   and renders escaped text plus `services.descriptionHtml(description)`. Complete
   when two users cannot share a quote, expiry refetches, locale output is correct,
   unsafe markup cannot execute, and quote failures return a generic 502 response.
2. **Own authorization and mutation at the purchase route.**
   `POST /api/buy` derives the fixed product and permission from the route and
   session, calls `services.purchase`, and invalidates the matching cache entry
   only after confirmation. JSON consumers receive a result payload; native forms
   redirect back with a non-authoritative presentation flag for success feedback.
   Complete when viewers receive 403 regardless of submitted fields and a buyer's
   next quote changes without invalidating another user's quote.
3. **Add the resilient interface and enhancement.**
   Server-rendered semantic HTML owns content, native form, disabled state, and
   status region. `src/style.css` owns the responsive visual system. `src/app.mjs`
   guards repeated activation while pending, sends the form, and publishes generic
   accessible success/failure feedback while restoring the button after failure.
   Complete in a real browser with scripts enabled and disabled.

## Supporting contracts and ownership

- `createApp(services) -> async (req, res)`: public HTTP boundary and route owner.
  It authenticates protected product/API routes, serves only the two explicit
  browser assets, translates expected authorization/upstream outcomes to HTTP,
  and never returns exception details.
- `getCachedQuote(sku, session) -> Promise<quote>` (private closure): quote cache
  owner. Identity is `[tenantId, userId, sku]`; freshness is `services.now() <
  quote.validUntil`. It publishes a value only after a successful service result,
  so rejected reads are not cached.
- `renderProductPage({quote, session, locale, message}) -> string` (private pure
  renderer): outputs the complete semantic document. Text/attribute data uses
  `services.escapeHtml`; description HTML enters only through the platform's
  allowlist formatter; price formatting receives an explicit locale.
- `handlePurchase(req, res, session)`: ordered command owner. Permission precedes
  the effect; cache invalidation follows confirmed purchase. While the command is
  pending, enhanced UI blocks only duplicate local submissions. The service
  remains authoritative across tabs or retries.
- The browser enhancement owns only ephemeral `pending` and announced feedback.
  It neither determines permission nor stores quote/business state.

The server remains a small imperative HTTP shell around pure formatting/rendering
operations because the repository has one product route and no framework or
shared component system. This preserves visible execution order without adding a
speculative abstraction layer.

## Technical architecture

```text
[Browser: semantic HTML + native form]
       | GET /products/sku1, POST /api/buy
       v
[server/app.mjs: routing, response policy, page renderer]
       |-- readSession(req) --------------------------> [platform session]
       |-- canBuy(session) ---------------------------> [platform policy]
       |-- getCachedQuote(sku, session) -- cache -----> [platform getQuote/now]
       |-- handlePurchase(session) -------------------> [platform purchase]
       |-- descriptionHtml(value) --------------------> [platform safe formatter]
       |
       +-- GET /src/app.mjs, /src/style.css ----------> [public browser assets]

[src/app.mjs] -- enhances only form pending/result --> [status region]
```

Dependencies point from the HTTP application to the injected platform contract;
browser code has no import or route to server/platform.mjs.

## Representative data flow

```text
GET product
  cookie -> readSession -> unauthorized: 401
                       \-> session + fixed sku -> identity cache key
                              -> fresh hit -> quote
                              -> miss/expired -> getQuote
                                  -> rejection -> generic 502
                                  -> quote -> cache until validUntil
  quote -> select public fields -> locale price + escaped text + safe description
        -> HTML -> visible product and buyer/viewer control

POST purchase
  cookie -> readSession -> missing: 401
                       \-> canBuy -> false: 403
                                  \-> purchase(fixed sku, session)
                                      -> rejection -> generic purchase failure
                                      -> confirmed result -> delete same identity key
                                          -> JSON success -> enhanced status
                                          -> 303 GET -> fresh quote + native status
```

## Verification, recovery, and evolution

The existing Node contract tests cover cache identity/expiry, server permission,
mutation invalidation, public-data selection, safe description handling, and safe
upstream failure. Existing Playwright checks cover French formatting, script-free
content and purchase, disabled viewer behavior, XSS non-execution, and enhanced
feedback. Manual code cross-read must additionally confirm only explicit public
assets are served and the pending guard is released on every current completion.

No migration or release action is needed. On a purchase service rejection the
quote cache remains valid because no authoritative effect was confirmed. A likely
follow-up is adding another product route: the fixed route-to-SKU mapping and the
cache key already isolate SKU, so it requires extending route selection without
changing authorization, rendering, or cache ownership; it does not justify a
general catalog/router layer today.

Implementation status: planned; executed evidence will be recorded after checks.
