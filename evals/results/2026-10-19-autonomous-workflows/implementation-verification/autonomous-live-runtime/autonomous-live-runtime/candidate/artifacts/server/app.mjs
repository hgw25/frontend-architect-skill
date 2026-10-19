import {readFile} from 'node:fs/promises';
import * as platform from './platform.mjs';

const PRODUCT_PATH = '/products/sku1';
const PURCHASE_PATH = '/api/buy';
const SKU = 'sku1';
const DEFAULT_LOCALE = 'en-US';
const SUPPORTED_LOCALES = new Set([DEFAULT_LOCALE, 'fr-FR']);
const STATIC_ASSETS = new Map([
  ['/src/app.mjs', {url: new URL('../src/app.mjs', import.meta.url), type: 'text/javascript; charset=utf-8'}],
  ['/src/style.css', {url: new URL('../src/style.css', import.meta.url), type: 'text/css; charset=utf-8'}],
]);

function cacheKey(sku, session) {
  return JSON.stringify([session.tenantId, session.userId, sku]);
}

function requestedLocale(url) {
  const locale = url.searchParams.get('lang');
  return SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
}

function wantsJson(req) {
  return String(req.headers.accept || '').includes('application/json');
}

function setSecurityHeaders(res) {
  res.setHeader('content-security-policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('x-content-type-options', 'nosniff');
}

function sendHtml(res, status, html) {
  setSecurityHeaders(res);
  res.writeHead(status, {'content-type': 'text/html; charset=utf-8'});
  res.end(html);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function renderDocument({lang = DEFAULT_LOCALE, title, body}) {
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  ${body}
</body>
</html>`;
}

function renderMessagePage(services, status, heading, message) {
  const safeHeading = services.escapeHtml(heading);
  const safeMessage = services.escapeHtml(message);
  return renderDocument({
    title: safeHeading,
    body: `<main class="message-page">
      <section class="notice-card" aria-labelledby="message-heading">
        <p class="eyebrow">Account store</p>
        <h1 id="message-heading">${safeHeading}</h1>
        <p role="status">${safeMessage}</p>
        ${status === 401 ? '' : `<a class="text-link" href="${PRODUCT_PATH}">Return to product</a>`}
      </section>
    </main>`,
  });
}

function toQuoteView(services, quote, locale) {
  const name = services.escapeHtml(quote.name);
  const price = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: quote.currency,
  }).format(quote.price);

  return {
    sku: quote.sku,
    name,
    price: services.escapeHtml(price),
    description: services.descriptionHtml(quote.description),
  };
}

function renderProductPage({services, quote, locale, canBuy, statusMessage = '', statusKind = 'success'}) {
  const view = toQuoteView(services, quote, locale);
  const safeStatus = services.escapeHtml(statusMessage);
  const button = canBuy
    ? '<button class="buy-button" type="submit"><span>Buy</span><span aria-hidden="true">→</span></button>'
    : '<button class="buy-button" type="submit" disabled>Buy</button>';
  const permissionNote = canBuy
    ? 'Secure purchase · Your account will be charged after confirmation.'
    : 'Your account can view this quote but cannot make purchases.';

  return renderDocument({
    lang: locale,
    title: `${view.name} — Account store`,
    body: `<main class="product-shell">
      <a class="brand" href="${PRODUCT_PATH}" aria-label="Account store home">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span>Account store</span>
      </a>
      <article class="product-card">
        <section class="product-visual" aria-label="Product preview">
          <p class="visual-label">Everyday series</p>
          <div class="mug" aria-hidden="true"><span></span></div>
          <p class="visual-caption">Built for the workday</p>
        </section>
        <section class="product-details" aria-labelledby="product-name">
          <p class="eyebrow">Member quote · ${services.escapeHtml(view.sku)}</p>
          <h1 id="product-name">${view.name}</h1>
          <div class="description" aria-label="Description">${view.description}</div>
          <div class="quote-block">
            <span class="quote-label">Your current quote</span>
            <p class="price" data-testid="price">${view.price}</p>
          </div>
          <form method="post" action="${PURCHASE_PATH}?lang=${locale}" data-purchase-form>
            <input type="hidden" name="sku" value="${SKU}">
            ${button}
          </form>
          <p class="permission-note">${permissionNote}</p>
          <p class="purchase-status" role="status" aria-live="polite" data-kind="${statusKind}">${safeStatus}</p>
        </section>
      </article>
      <footer>Quote availability and price are tied to your signed-in account.</footer>
      <script type="module" src="/src/app.mjs"></script>
    </main>`,
  });
}

export function createApp(services = platform) {
  const quoteCache = new Map();
  const cacheGenerations = new Map();

  async function getCachedQuote(sku, session) {
    const key = cacheKey(sku, session);
    const cached = quoteCache.get(key);
    if (cached && cached.validUntil > services.now()) return cached;

    quoteCache.delete(key);
    const generation = cacheGenerations.get(key) || 0;
    const quote = await services.getQuote(sku, session);
    if ((cacheGenerations.get(key) || 0) === generation) quoteCache.set(key, quote);
    return quote;
  }

  function invalidateQuote(sku, session) {
    const key = cacheKey(sku, session);
    quoteCache.delete(key);
    cacheGenerations.set(key, (cacheGenerations.get(key) || 0) + 1);
  }

  async function renderQuote(res, session, locale, options = {}) {
    try {
      const quote = await getCachedQuote(SKU, session);
      sendHtml(res, options.httpStatus || 200, renderProductPage({
        services,
        quote,
        locale,
        canBuy: services.canBuy(session),
        statusMessage: options.statusMessage,
        statusKind: options.statusKind,
      }));
    } catch {
      sendHtml(res, 502, renderMessagePage(services, 502, 'Quote unavailable', 'We could not load your quote. Please try again.'));
    }
  }

  async function handlePurchase(req, res, session, locale) {
    if (!services.canBuy(session)) {
      if (wantsJson(req)) {
        sendJson(res, 403, {ok: false, message: 'Your account cannot make purchases.'});
      } else {
        await renderQuote(res, session, locale, {
          httpStatus: 403,
          statusMessage: 'Your account cannot make purchases.',
          statusKind: 'error',
        });
      }
      return;
    }

    try {
      await services.purchase(SKU, session);
      invalidateQuote(SKU, session);
    } catch {
      if (wantsJson(req)) {
        sendJson(res, 502, {ok: false, message: 'Purchase failed. Please try again.'});
      } else {
        await renderQuote(res, session, locale, {
          httpStatus: 502,
          statusMessage: 'Purchase failed. Please try again.',
          statusKind: 'error',
        });
      }
      return;
    }

    if (wantsJson(req)) {
      const body = {ok: true, message: 'Purchase accepted.'};
      try {
        const quote = await getCachedQuote(SKU, session);
        body.price = toQuoteView(services, quote, locale).price;
      } catch {
        // The purchase is already confirmed; a quote refresh cannot change its outcome.
      }
      sendJson(res, 200, body);
      return;
    }

    await renderQuote(res, session, locale, {statusMessage: 'Purchase accepted.'});
  }

  return async function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const asset = STATIC_ASSETS.get(url.pathname);
    if (req.method === 'GET' && asset) {
      res.writeHead(200, {'content-type': asset.type, 'x-content-type-options': 'nosniff'});
      res.end(await readFile(asset.url));
      return;
    }

    const isProductRead = req.method === 'GET' && url.pathname === PRODUCT_PATH;
    const isPurchase = req.method === 'POST' && url.pathname === PURCHASE_PATH;
    if (!isProductRead && !isPurchase) {
      sendHtml(res, 404, renderMessagePage(services, 404, 'Page not found', 'The requested page does not exist.'));
      return;
    }

    const session = services.readSession(req);
    if (!session) {
      if (isPurchase && wantsJson(req)) {
        sendJson(res, 401, {ok: false, message: 'Login required.'});
      } else {
        sendHtml(res, 401, renderMessagePage(services, 401, 'Login required', 'Sign in to view your account quote.'));
      }
      return;
    }

    const locale = requestedLocale(url);
    if (isPurchase) {
      await handlePurchase(req, res, session, locale);
      return;
    }

    await renderQuote(res, session, locale);
  };
}
