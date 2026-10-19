import { readFile } from 'node:fs/promises';

import * as platform from './platform.mjs';

const PRODUCT_SKU = 'sku1';
const PRODUCT_PATH = `/products/${PRODUCT_SKU}`;
const PUBLIC_ASSETS = new Map([
  ['/src/app.mjs', { type: 'text/javascript; charset=utf-8', url: new URL('../src/app.mjs', import.meta.url) }],
  ['/src/style.css', { type: 'text/css; charset=utf-8', url: new URL('../src/style.css', import.meta.url) }],
]);
const SUPPORTED_LOCALES = new Set(['en-US', 'fr-FR']);

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

function selectedLocale(url) {
  const requested = url.searchParams.get('lang');
  return SUPPORTED_LOCALES.has(requested) ? requested : 'en-US';
}

function formatPrice(quote, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: quote.currency,
    minimumFractionDigits: 2,
  }).format(quote.price);
}

function renderProductPage({ services, quote, locale, canBuy, status = '' }) {
  const escape = services.escapeHtml;
  const productName = escape(quote.name);
  const displayPrice = escape(formatPrice(quote, locale));
  const disabled = canBuy ? '' : ' disabled aria-describedby="permission-note"';
  const permissionNote = canBuy
    ? ''
    : '<p class="permission-note" id="permission-note">Your account can view quotes but cannot make purchases.</p>';

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${productName} — North Supply</title>
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${PRODUCT_PATH}" aria-label="North Supply home"><span class="brand-mark">N</span><span>North Supply</span></a>
    <span class="account-label">Account pricing</span>
  </header>
  <main class="product-page">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${PRODUCT_PATH}">Catalog</a><span aria-hidden="true">/</span><span>Drinkware</span></nav>
    <article class="product-layout">
      <figure class="product-visual" aria-label="Steel mug product preview">
        <div class="mug" aria-hidden="true"><span>NS</span></div>
        <figcaption>Built for everyday use</figcaption>
      </figure>
      <div class="product-details">
        <p class="eyebrow">Field essentials · SKU 01</p>
        <h1>${productName}</h1>
        <section class="description" aria-label="Description">${services.descriptionHtml(quote.description)}</section>
        <div class="divider"></div>
        <section class="quote" aria-labelledby="quote-heading">
          <p class="quote-label" id="quote-heading">Your current quote</p>
          <p class="price" data-testid="price">${displayPrice}</p>
          <p class="quote-note">Personalized for your account · Limited-time quote</p>
        </section>
        <form method="post" action="/api/buy?lang=${locale}">
          <input type="hidden" name="sku" value="${PRODUCT_SKU}">
          <button type="submit"${disabled}><span>Buy</span><span aria-hidden="true">→</span></button>
        </form>
        ${permissionNote}
        <p class="purchase-status" role="status" aria-live="polite">${escape(status)}</p>
        <ul class="assurances" aria-label="Purchase assurances">
          <li><span aria-hidden="true">✓</span> Account-secured purchase</li>
          <li><span aria-hidden="true">✓</span> Quote confirmed at checkout</li>
        </ul>
      </div>
    </article>
  </main>
  <script type="module" src="/src/app.mjs"></script>
</body>
</html>`;
}

function renderAcceptedWithoutQuote(locale) {
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Purchase accepted</title><link rel="stylesheet" href="/src/style.css"></head><body><main class="result-page"><p class="eyebrow">Order update</p><h1>Purchase accepted</h1><p role="status">Purchase accepted. Your updated quote is temporarily unavailable.</p><a class="text-link" href="${PRODUCT_PATH}?lang=${locale}">Return to the product</a></main></body></html>`;
}

export function createApp(services = platform) {
  const quoteCache = new Map();
  const cacheKey = (sku, session) => JSON.stringify([session.tenantId, session.userId, sku]);

  async function getCurrentQuote(sku, session) {
    const key = cacheKey(sku, session);
    const cached = quoteCache.get(key);
    if (cached && cached.validUntil > services.now()) return cached;

    quoteCache.delete(key);
    const quote = await services.getQuote(sku, session);
    quoteCache.set(key, quote);
    return quote;
  }

  return async function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const asset = PUBLIC_ASSETS.get(url.pathname);
    if (req.method === 'GET' && asset) {
      send(res, 200, await readFile(asset.url), asset.type);
      return;
    }

    const isProductRequest = req.method === 'GET' && url.pathname === PRODUCT_PATH;
    const isPurchaseRequest = req.method === 'POST' && url.pathname === '/api/buy';
    if (!isProductRequest && !isPurchaseRequest) {
      send(res, 404, 'Not found');
      return;
    }

    const session = services.readSession(req);
    if (!session) {
      send(res, 401, 'Login required');
      return;
    }

    const locale = selectedLocale(url);
    if (isProductRequest) {
      try {
        const quote = await getCurrentQuote(PRODUCT_SKU, session);
        send(
          res,
          200,
          renderProductPage({ services, quote, locale, canBuy: services.canBuy(session) }),
          'text/html; charset=utf-8',
        );
      } catch {
        send(res, 502, 'Quote service unavailable. Please try again later.');
      }
      return;
    }

    if (!services.canBuy(session)) {
      send(res, 403, 'Purchase not permitted for this account.');
      return;
    }

    try {
      await services.purchase(PRODUCT_SKU, session);
    } catch {
      send(res, 502, 'Purchase could not be confirmed.');
      return;
    }

    quoteCache.delete(cacheKey(PRODUCT_SKU, session));
    let quote;
    try {
      quote = await getCurrentQuote(PRODUCT_SKU, session);
    } catch {
      if (String(req.headers.accept).includes('application/json')) {
        send(res, 200, JSON.stringify({ ok: true, message: 'Purchase accepted' }), 'application/json; charset=utf-8');
      } else {
        send(res, 200, renderAcceptedWithoutQuote(locale), 'text/html; charset=utf-8');
      }
      return;
    }

    if (String(req.headers.accept).includes('application/json')) {
      send(
        res,
        200,
        JSON.stringify({ ok: true, message: 'Purchase accepted', displayPrice: formatPrice(quote, locale) }),
        'application/json; charset=utf-8',
      );
      return;
    }

    send(
      res,
      200,
      renderProductPage({ services, quote, locale, canBuy: true, status: 'Purchase accepted' }),
      'text/html; charset=utf-8',
    );
  };
}
