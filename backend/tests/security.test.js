import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import session from 'express-session';
import { MemoryStore } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';
import { createApp } from '../app.js';
import { readConfig } from '../config/env.js';
import { priceCents } from '../lib/money.js';
import { passwordSchema } from '../lib/validation.js';
import { verifyWebhook } from '../services/payments.js';

const config = readConfig({ SESSION_SECRET: 'isolated-test-secret-with-at-least-32-characters' });
let server, base, user, hash;
const pool = {
  async execute(sql, values) {
    if (sql.startsWith('SELECT id, nombre, email, rol, password'))
      return [[values[0] === user.email ? { ...user, password: hash } : undefined].filter(Boolean)];
    if (sql.startsWith('SELECT id, nombre, email, rol'))
      return [[values[0] === user.id ? user : undefined].filter(Boolean)];
    if (sql.startsWith('SELECT id, estado')) return [[]];
    if (sql.includes('FROM productos')) return [[]];
    throw new Error('Unexpected test query');
  },
};
before(async () => {
  hash = await bcrypt.hash('my-long-secure-passphrase', 12);
  user = { id: 9, nombre: 'Test user', email: 'test@example.test', rol: 'usuario' };
  const app = createApp({
    pool,
    config,
    sessionStore: new session.MemoryStore(),
    rateStore: () => new MemoryStore(),
    provider: {
      ready() {
        throw new Error('Never call real payments in tests');
      },
    },
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise((resolve) => server.close(resolve)));
async function guest() {
  const response = await fetch(base + '/api/auth/session');
  const data = await response.json();
  return {
    cookie: response.headers.get('set-cookie').split(';')[0],
    token: data.csrfToken,
    response,
    data,
  };
}
async function request(path, client, body = {}, method = 'POST', origin = config.frontendUrl) {
  return fetch(base + path, {
    method,
    headers: {
      Cookie: client.cookie,
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-Token': client.token,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
}
async function login() {
  const client = await guest();
  const response = await request('/api/auth/login', client, {
    email: user.email,
    password: 'my-long-secure-passphrase',
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  return {
    ...client,
    oldCookie: client.cookie,
    cookie: response.headers.get('set-cookie').split(';')[0],
    token: data.csrfToken,
    data,
  };
}
test('session is HttpOnly, SameSite, contains no identity and exposes no hash', async () => {
  const client = await guest();
  assert.match(client.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(client.response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal(client.data.user, null);
  assert.equal(client.data.csrfToken.length, 64);
  assert.equal(client.response.headers.get('cache-control'), 'no-store');
});
test('login rotates session and CSRF; sign-out invalidates replayed cookie', async () => {
  const client = await login();
  assert.notEqual(client.cookie, client.oldCookie);
  assert.equal(client.data.user.password, undefined);
  const old = await fetch(base + '/api/auth/session', { headers: { Cookie: client.oldCookie } });
  assert.equal((await old.json()).user, null);
  assert.equal((await request('/api/auth/logout', client)).status, 204);
  const replay = await fetch(base + '/api/auth/session', { headers: { Cookie: client.cookie } });
  assert.equal((await replay.json()).user, null);
});
test('unknown account and incorrect password use same generic response', async () => {
  const client = await guest();
  const a = await request('/api/auth/login', client, {
    email: 'unknown@example.test',
    password: 'incorrect-password',
  });
  const b = await request('/api/auth/login', client, {
    email: user.email,
    password: 'incorrect-password',
  });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(await a.json(), await b.json());
});
test('plaintext password does not silently become trusted during login', async () => {
  const client = await guest();
  const original = hash;
  hash = 'my-long-secure-passphrase';
  try {
    assert.equal(
      (await request('/api/auth/login', client, { email: user.email, password: hash })).status,
      401,
    );
  } finally {
    hash = original;
  }
});
test('forged origin and missing CSRF are rejected before authentication', async () => {
  const client = await guest();
  assert.equal(
    (await request('/api/auth/login', client, {}, 'POST', 'https://evil.example')).status,
    403,
  );
  assert.equal((await request('/api/cart', { ...client, token: '' })).status, 403);
});
test('guest cannot access cart or admin and customer cannot change admin inventory', async () => {
  const client = await guest();
  assert.equal((await request('/api/cart', client, {}, 'GET')).status, 401);
  const customer = await login();
  assert.equal((await request('/api/admin/products', customer, {}, 'GET')).status, 403);
  assert.equal((await request('/api/admin/products/1', customer, {}, 'DELETE')).status, 403);
});
test('cart rejects client identity, prices and negative quantities', async () => {
  const client = await login();
  for (const body of [
    { id_producto: 1, id_usuario: 22 },
    { id_producto: 1, precio: 1 },
    { id_producto: 1, cantidad: -1 },
    { id_producto: '1 OR 1=1' },
  ]) {
    assert.equal((await request('/api/cart', client, body)).status, 400);
  }
});
test('order lookup only queries authenticated owner and does not disclose other orders', async () => {
  const client = await login();
  assert.equal(
    (await request('/api/orders/123e4567-e89b-42d3-a456-426614174000', client, {}, 'GET')).status,
    404,
  );
});
test('login limiter rejects excess attempts', async () => {
  const client = await guest();
  let response;
  for (let index = 0; index < 12; index++)
    response = await request('/api/auth/login', client, { email: 'bad' });
  assert.equal(response.status, 429);
});
test('prices calculated in cents, discounts validated and bcrypt length never truncated', () => {
  assert.equal(priceCents({ precio: '123.45', oferta: 10 }), 11111);
  for (const product of [{ precio: -1 }, { precio: 'NaN' }, { precio: 10, oferta: 101 }])
    assert.throws(() => priceCents(product));
  assert.equal(passwordSchema.safeParse('é'.repeat(37)).success, false);
});
test('webhook requires signed data ID; forged body is ignored and duplicate handling belongs to orders', () => {
  const secret = 'test-webhook-secret';
  const signed = createHmac('sha256', secret)
    .update('id:123;request-id:request-1;ts:1742505638683;')
    .digest('hex');
  const req = {
    query: { 'data.id': '123' },
    get: (key) => (key === 'x-signature' ? 'ts=1742505638683,v1=' + signed : 'request-1'),
  };
  assert.equal(verifyWebhook(req, secret), '123');
  assert.throws(() => verifyWebhook({ ...req, query: { 'data.id': '124' } }, secret), /inválida/);
  assert.throws(() => verifyWebhook(req, ''), /inválida/);
});
test('production refuses weak secret and insecure origins', () => {
  assert.throws(() => readConfig({ SESSION_SECRET: 'short' }));
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: config.secret,
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'http://example.test',
    }),
  );
});
