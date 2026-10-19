# Account product quote

Implementation decisions and verification are recorded in
[the product quote design](docs/product-quote-design.md).

This application serves /products/sku1 and accepts purchases at POST /api/buy.
The server platform already supplies session lookup, buyer permission, product
quotes, purchase execution, a clock and safe description formatting. Browser
code is served only from src. Keep the existing public paths and platform API.

Quotes depend on tenant and user, have validUntil timestamps, and may be cached
until expiry. A successful purchase invalidates that user's quote so the next
page request shows the new amount. Other users keep their own quote. Login is
required to view a quote; viewers may read but cannot buy. Query parameters or
browser form values never grant buyer permission. Service tokens and internal
cost are private; the browser receives only fields needed to display or act.

Product description allows the existing platform's p/strong/em formatting. Other
markup is displayed safely. The page supports en-US and fr-FR prices, retains
readable product content without JavaScript, and supports the native purchase
form in that mode. JavaScript enhances feedback without changing authorization.
Upstream failure is a visible failure, not a zero price or a private stack trace.
The server test uses createApp(services), where services follow platform.mjs.
Run node --test test/server.test.mjs and npm run check.
