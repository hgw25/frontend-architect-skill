import {readFile} from 'node:fs/promises';
import * as platform from './platform.mjs';

const PRODUCT_SKU = 'sku1';
const PRODUCT_PATH = `/products/${PRODUCT_SKU}`;
const PUBLIC_ASSETS = new Map([
  ['/src/app.mjs', {
    contentType: 'text/javascript; charset=utf-8',
    source: new URL('../src/app.mjs', import.meta.url),
  }],
  ['/src/style.css', {
    contentType: 'text/css; charset=utf-8',
    source: new URL('../src/style.css', import.meta.url),
  }],
]);

function send(res, status, contentType, body, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

function sendText(res, status, message) {
  send(res, status, 'text/plain; charset=utf-8', message);
}

function localeFrom(url) {
  return url.searchParams.get('lang') === 'fr-FR' ? 'fr-FR' : 'en-US';
}

function priceLabel(quote, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: quote.currency,
    minimumFractionDigits: 2,
  }).format(quote.price);
}

function pageShell({language, title, content}) {
  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#17231d">
    <title>${title}</title>
    <link rel="stylesheet" href="/src/style.css">
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

function renderProductPage(services, {quote, session, locale}) {
  const name = services.escapeHtml(quote.name);
  const sku = services.escapeHtml(quote.sku);
  const canBuy = services.canBuy(session);
  const unavailableNote = canBuy
    ? ''
    : '<p class="permission-note">Your account can view this quote, but cannot make purchases.</p>';
  const disabled = canBuy ? '' : ' disabled aria-describedby="purchase-permission"';
  const permissionId = canBuy ? '' : ' id="purchase-permission"';

  return pageShell({
    language: locale,
    title: `${name} — Current quote`,
    content: `<main class="product-page">
      <a class="brand" href="${PRODUCT_PATH}" aria-label="Forge Supply home">
        <span class="brand-mark" aria-hidden="true">F</span>
        <span>Forge Supply</span>
      </a>
      <article class="product-card">
        <div class="product-visual" aria-hidden="true">
          <div class="mug">
            <span class="mug-shine"></span>
            <span class="mug-handle"></span>
          </div>
          <span class="material-label">18/8 STEEL</span>
        </div>
        <div class="product-details">
          <p class="eyebrow">Current account quote</p>
          <h1>${name}</h1>
          <p class="sku">Item ${sku}</p>
          <section class="description" aria-label="Description">
            ${services.descriptionHtml(quote.description)}
          </section>
          <div class="quote-panel">
            <div>
              <span class="quote-label">Your price</span>
              <p class="price" data-testid="price">${priceLabel(quote, locale)}</p>
            </div>
            <span class="availability"><span aria-hidden="true"></span> In stock</span>
          </div>
          <form class="purchase-form" method="post" action="/api/buy" data-purchase-form>
            <input type="hidden" name="sku" value="${sku}">
            <button class="buy-button" type="submit"${disabled}>
              <span>Buy</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <div${permissionId}>${unavailableNote}</div>
          <p class="purchase-status" role="status" aria-live="polite"></p>
          <p class="assurance">Secure account purchase · Quote refreshes after checkout</p>
        </div>
      </article>
    </main>
    <script type="module" src="/src/app.mjs"></script>`,
  });
}

function renderPurchaseResult(services, locale) {
  const title = services.escapeHtml('Purchase accepted');
  return pageShell({
    language: locale,
    title,
    content: `<main class="result-page">
      <section class="result-card" aria-labelledby="result-title">
        <span class="success-mark" aria-hidden="true">✓</span>
        <p class="eyebrow">Order confirmed</p>
        <h1 id="result-title">${title}</h1>
        <p role="status">Purchase accepted. Your account quote has been refreshed.</p>
        <a class="buy-button result-link" href="${PRODUCT_PATH}?lang=${locale}">View updated quote <span aria-hidden="true">→</span></a>
      </section>
    </main>`,
  });
}

function wantsJson(req) {
  return String(req.headers.accept || '').includes('application/json');
}

export function createApp(services = platform) {
  const quoteCache = new Map();
  const cacheKey = (sku, session) => JSON.stringify([session.tenantId, session.userId, sku]);

  async function getCachedQuote(sku, session) {
    const key = cacheKey(sku, session);
    const cached = quoteCache.get(key);
    if (cached && services.now() < cached.validUntil) return cached;

    quoteCache.delete(key);
    const quote = await services.getQuote(sku, session);
    quoteCache.set(key, quote);
    return quote;
  }

  async function serveAsset(req, res, pathname) {
    const asset = PUBLIC_ASSETS.get(pathname);
    if (!asset || req.method !== 'GET') return false;
    send(res, 200, asset.contentType, await readFile(asset.source), {
      'cache-control': 'no-cache',
    });
    return true;
  }

  async function handlePurchase(req, res, session, locale) {
    if (!services.canBuy(session)) {
      if (wantsJson(req)) {
        send(res, 403, 'application/json; charset=utf-8', JSON.stringify({ok: false, message: 'Purchase not permitted'}));
      } else {
        sendText(res, 403, 'Purchase not permitted');
      }
      return;
    }

    try {
      await services.purchase(PRODUCT_SKU, session);
      quoteCache.delete(cacheKey(PRODUCT_SKU, session));
    } catch {
      if (wantsJson(req)) {
        send(res, 502, 'application/json; charset=utf-8', JSON.stringify({ok: false, message: 'Purchase failed'}));
      } else {
        sendText(res, 502, 'Purchase failed. Please try again.');
      }
      return;
    }

    if (wantsJson(req)) {
      send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ok: true, message: 'Purchase accepted'}));
      return;
    }

    send(res, 200, 'text/html; charset=utf-8', renderPurchaseResult(services, locale));
  }

  return async function app(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (await serveAsset(req, res, url.pathname)) return;

    const isProductRequest = url.pathname === PRODUCT_PATH && req.method === 'GET';
    const isPurchaseRequest = url.pathname === '/api/buy' && req.method === 'POST';
    if (!isProductRequest && !isPurchaseRequest) {
      sendText(res, 404, 'Not found');
      return;
    }

    const session = services.readSession(req);
    if (!session) {
      sendText(res, 401, 'Login required');
      return;
    }

    const locale = localeFrom(url);
    if (isPurchaseRequest) {
      await handlePurchase(req, res, session, locale);
      return;
    }

    try {
      const quote = await getCachedQuote(PRODUCT_SKU, session);
      send(res, 200, 'text/html; charset=utf-8', renderProductPage(services, {quote, session, locale}));
    } catch {
      sendText(res, 502, 'Quote service unavailable. Please try again.');
    }
  };
}
