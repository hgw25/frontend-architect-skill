import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.mjs';
import * as services from '../server/platform.mjs';

function request(handler, path, {method = 'GET', session, accept} = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (session) headers.cookie = `session=${session}`;
    if (accept) headers.accept = accept;

    const responseHeaders = new Map();
    const response = {
      statusCode: 200,
      setHeader(name, value) {
        responseHeaders.set(name.toLowerCase(), value);
      },
      writeHead(status, values = {}) {
        this.statusCode = status;
        for (const [name, value] of Object.entries(values)) this.setHeader(name, value);
        return this;
      },
      end(body = '') {
        resolve({status: this.statusCode, headers: responseHeaders, body: String(body)});
      },
    };

    Promise.resolve(handler({url: path, method, headers}, response)).catch(reject);
  });
}

test('renders a scoped, localized, and safe quote', async () => {
  services.reset();
  const handler = createApp(services);

  assert.equal((await request(handler, '/products/sku1')).status, 401);
  const french = await request(handler, '/products/sku1?lang=fr-FR', {session: 'a'});
  assert.equal(french.status, 200);
  assert.match(french.body, /12,50/);
  assert.match(french.body, /<strong>Steel<\/strong>/);
  assert.doesNotMatch(french.body, /<img\s|<script>window\.__pwned|serviceToken|internalCost|qa-service-private-token/);

  const otherUser = await request(handler, '/products/sku1', {session: 'b'});
  assert.match(otherUser.body, /\$27\.00/);
  assert.equal(services.quoteCalls('user-a'), 1);
  assert.equal(services.quoteCalls('user-b'), 1);

  await request(handler, '/products/sku1', {session: 'a'});
  assert.equal(services.quoteCalls('user-a'), 1);
  services.advance(1001);
  await request(handler, '/products/sku1', {session: 'a'});
  assert.equal(services.quoteCalls('user-a'), 2);
});

test('authorizes purchases and invalidates only the buyer quote', async () => {
  services.reset();
  const handler = createApp(services);
  await request(handler, '/products/sku1', {session: 'a'});
  await request(handler, '/products/sku1', {session: 'b'});

  const denied = await request(handler, '/api/buy', {
    method: 'POST',
    session: 'v',
    accept: 'application/json',
  });
  assert.equal(denied.status, 403);

  const bought = await request(handler, '/api/buy', {
    method: 'POST',
    session: 'a',
    accept: 'application/json',
  });
  assert.deepEqual(JSON.parse(bought.body), {ok: true, message: 'Purchase accepted.', price: '$13.50'});

  const refreshed = await request(handler, '/products/sku1', {session: 'a'});
  assert.match(refreshed.body, /\$13\.50/);
  await request(handler, '/products/sku1', {session: 'b'});
  assert.equal(services.quoteCalls('user-b'), 1);
});

test('native purchase returns the accepted outcome and refreshed quote', async () => {
  services.reset();
  const handler = createApp(services);
  const response = await request(handler, '/api/buy?lang=fr-FR', {method: 'POST', session: 'a'});

  assert.equal(response.status, 200);
  assert.match(response.body, /Purchase accepted\./);
  assert.match(response.body, /13,50/);
});

test('does not leak upstream failures', async () => {
  services.reset();
  const handler = createApp({
    ...services,
    getQuote: async () => {
      throw new Error('private-backend-debug');
    },
  });
  const response = await request(handler, '/products/sku1', {session: 'a'});

  assert.equal(response.status, 502);
  assert.match(response.body, /unavailable/i);
  assert.doesNotMatch(response.body, /private-backend-debug/);
});
