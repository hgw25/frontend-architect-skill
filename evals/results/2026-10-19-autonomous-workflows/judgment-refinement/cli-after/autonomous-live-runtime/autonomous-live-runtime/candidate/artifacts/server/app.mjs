import * as platform from './platform.mjs';
import {readFile} from 'node:fs/promises';

const SKU = 'sku1';
const browserFiles = new Map([
  ['/src/app.mjs', {type: 'text/javascript', file: '../src/app.mjs'}],
  ['/src/style.css', {type: 'text/css', file: '../src/style.css'}],
]);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function quoteKey(session) {
  return `${session.tenantId}:${session.userId}:${SKU}`;
}

function localeFor(request, url) {
  return url.searchParams.get('lang') === 'fr-FR' || request.headers['accept-language']?.toLowerCase().includes('fr-fr')
    ? 'fr-FR'
    : 'en-US';
}

function formatPrice(price, currency, locale) {
  return new Intl.NumberFormat(locale, {style: 'currency', currency}).format(price);
}

function wantsJson(request) {
  return request.headers.accept?.includes('application/json');
}

function page({quote, session, locale, services, purchaseConfirmed}) {
  const price = formatPrice(quote.price, quote.currency, locale);
  const purchaseControl = services.canBuy(session)
    ? '<form method="post" action="/api/buy"><button type="submit">Buy</button></form>'
    : '<form action="/api/buy"><button type="submit" disabled aria-describedby="purchase-notice">Buy</button></form><p class="notice" id="purchase-notice">Your account can view this quote but cannot purchase it.</p>';

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(quote.name)} quote</title>
    <link rel="stylesheet" href="/src/style.css">
  </head>
  <body>
    <main class="quote-page">
      <article class="quote-card">
        <p class="eyebrow">Your quote</p>
        <h1>${escapeHtml(quote.name)}</h1>
        <p class="price" data-testid="price">${escapeHtml(price)}</p>
        <section class="description" aria-label="Description">${services.descriptionHtml(quote.description)}</section>
        ${purchaseControl}
        <p role="status" aria-live="polite">${purchaseConfirmed ? 'Purchase accepted.' : ''}</p>
      </article>
    </main>
    <script type="module" src="/src/app.mjs"></script>
  </body>
</html>`;
}

function quoteFailurePage() {
  return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Quote unavailable</title><main><h1>Quote unavailable</h1><p>We could not load your quote. Please try again.</p></main></html>';
}

export function createApp(services = platform) {
  const quoteCache = new Map();
  const purchaseConfirmations = new Set();

  async function readQuote(session) {
    const key = quoteKey(session);
    const cached = quoteCache.get(key);
    if (cached?.validUntil > services.now()) return cached;

    const quote = await services.getQuote(SKU, session);
    quoteCache.set(key, quote);
    return quote;
  }

  return async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const browserFile = browserFiles.get(url.pathname);
    if (browserFile) {
      response.setHeader('content-type', browserFile.type);
      response.end(await readFile(new URL(browserFile.file, import.meta.url)));
      return;
    }

    const session = services.readSession(request);
    if (!session) {
      response.writeHead(401).end('Login required');
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/buy') {
      if (!services.canBuy(session)) {
        if (wantsJson(request)) {
          response.writeHead(403, {'content-type': 'application/json'}).end(JSON.stringify({ok: false, message: 'Purchase is not available for this account.'}));
        } else {
          response.writeHead(403, {'content-type': 'text/html'}).end('<!doctype html><title>Purchase unavailable</title><p>Purchase is not available for this account.</p>');
        }
        return;
      }

      try {
        await services.purchase(SKU, session);
        quoteCache.delete(quoteKey(session));
        purchaseConfirmations.add(quoteKey(session));
      } catch {
        if (wantsJson(request)) {
          response.writeHead(502, {'content-type': 'application/json'}).end(JSON.stringify({ok: false, message: 'Purchase failed. Please try again.'}));
        } else {
          response.writeHead(502, {'content-type': 'text/html'}).end('<!doctype html><title>Purchase failed</title><p>Purchase failed. Please return to your quote and try again.</p>');
        }
        return;
      }

      if (wantsJson(request)) {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ok: true}));
      } else {
        response.writeHead(303, {location: `/products/${SKU}`}).end();
      }
      return;
    }

    if (request.method !== 'GET' || url.pathname !== `/products/${SKU}`) {
      response.writeHead(404).end('Not found');
      return;
    }

    try {
      const quote = await readQuote(session);
      const key = quoteKey(session);
      const purchaseConfirmed = purchaseConfirmations.delete(key);
      response.setHeader('content-type', 'text/html');
      response.end(page({quote, session, locale: localeFor(request, url), services, purchaseConfirmed}));
    } catch {
      response.writeHead(502, {'content-type': 'text/html'}).end(quoteFailurePage());
    }
  };
}
