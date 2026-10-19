import { readFile } from 'node:fs/promises';
import * as platform from './platform.mjs';

const productPath = '/products/sku1';
const productSku = 'sku1';
const supportedLocales = new Set(['en-US', 'fr-FR']);

const browserFiles = new Map([
  ['/src/app.mjs', ['../src/app.mjs', 'text/javascript; charset=utf-8']],
  ['/src/style.css', ['../src/style.css', 'text/css; charset=utf-8']],
]);

function send(res, status, contentType, body, headers = {}) {
  res.writeHead(status, { 'content-type': contentType, ...headers });
  res.end(body);
}

function cacheKey(session, sku) {
  return JSON.stringify([session.tenantId, session.userId, sku]);
}

function localeFrom(url) {
  const requested = url.searchParams.get('lang');
  return supportedLocales.has(requested) ? requested : 'en-US';
}

function wantsJson(req) {
  return String(req.headers.accept || '').toLowerCase().includes('application/json');
}

function publicQuote(quote) {
  return {
    sku: quote.sku,
    name: quote.name,
    price: quote.price,
    currency: quote.currency,
    description: quote.description,
    validUntil: quote.validUntil,
  };
}

function renderProduct(services, quote, session, locale, purchaseAccepted = false) {
  const safeQuote = publicQuote(quote);
  const name = services.escapeHtml(safeQuote.name);
  const description = services.descriptionHtml(safeQuote.description);
  const price = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: safeQuote.currency,
    minimumFractionDigits: 2,
  }).format(safeQuote.price);
  const canBuy = services.canBuy(session);
  const status = purchaseAccepted ? 'Purchase accepted' : '';

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${name} · Product quote</title>
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <main class="product-shell">
    <article class="product-card" aria-labelledby="product-title">
      <div class="product-visual" aria-hidden="true">
        <span class="product-mark">S</span>
        <span class="visual-caption">Built for every day</span>
      </div>
      <div class="product-copy">
        <p class="eyebrow">Current quote</p>
        <h1 id="product-title">${name}</h1>
        <p class="price" data-testid="price">${services.escapeHtml(price)}</p>
        <section class="description" aria-label="Description">${description}</section>
        <form method="post" action="/api/buy">
          <input type="hidden" name="sku" value="${productSku}">
          <button type="submit"${canBuy ? '' : ' disabled aria-describedby="permission-note"'}>Buy</button>
        </form>
        ${canBuy ? '' : '<p id="permission-note" class="note">Your account can view this quote but cannot purchase.</p>'}
        <p class="status" role="status" aria-live="polite">${status}</p>
      </div>
    </article>
  </main>
  <script type="module" src="/src/app.mjs"></script>
</body>
</html>`;
}

export function createApp(services = platform) {
  const quotes = new Map();

  async function quoteFor(session) {
    const key = cacheKey(session, productSku);
    const cached = quotes.get(key);
    if (cached?.quote && cached.quote.validUntil > services.now()) return cached.quote;
    if (cached?.pending) return cached.pending;

    const entry = {};
    const pending = Promise.resolve(services.getQuote(productSku, session))
      .then(quote => {
        if (quotes.get(key) === entry) quotes.set(key, { quote });
        return quote;
      })
      .catch(error => {
        if (quotes.get(key) === entry) quotes.delete(key);
        throw error;
      });
    entry.pending = pending;
    quotes.set(key, entry);
    return pending;
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const browserFile = browserFiles.get(url.pathname);

    if (browserFile && req.method === 'GET') {
      const [relativePath, contentType] = browserFile;
      send(res, 200, contentType, await readFile(new URL(relativePath, import.meta.url)), {
        'cache-control': 'no-cache',
      });
      return;
    }

    if (url.pathname !== productPath && url.pathname !== '/api/buy') {
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
      return;
    }

    const session = services.readSession(req);
    if (!session) {
      send(res, 401, 'text/plain; charset=utf-8', 'Login required');
      return;
    }

    if (url.pathname === '/api/buy') {
      if (req.method !== 'POST') {
        send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed', { allow: 'POST' });
        return;
      }
      if (!services.canBuy(session)) {
        if (wantsJson(req)) {
          send(res, 403, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: 'Purchase not allowed' }));
        } else {
          send(res, 403, 'text/plain; charset=utf-8', 'Purchase not allowed');
        }
        return;
      }

      try {
        await services.purchase(productSku, session);
      } catch {
        const message = 'Purchase service unavailable';
        send(
          res,
          502,
          wantsJson(req) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
          wantsJson(req) ? JSON.stringify({ ok: false, error: message }) : message,
        );
        return;
      }
      quotes.delete(cacheKey(session, productSku));

      if (wantsJson(req)) {
        send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ ok: true }));
      } else {
        res.writeHead(303, { location: `${productPath}?purchase=accepted` });
        res.end();
      }
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed', { allow: 'GET, HEAD' });
      return;
    }

    let quote;
    try {
      quote = await quoteFor(session);
    } catch {
      send(res, 502, 'text/plain; charset=utf-8', 'Quote service unavailable');
      return;
    }

    let html;
    try {
      html = renderProduct(
        services,
        quote,
        session,
        localeFrom(url),
        url.searchParams.get('purchase') === 'accepted',
      );
    } catch {
      send(res, 502, 'text/plain; charset=utf-8', 'Quote service unavailable');
      return;
    }
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'",
      'x-content-type-options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : html);
  };
}
