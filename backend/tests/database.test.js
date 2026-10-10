import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { orderService } from '../services/orders.js';
import { MySQLSessionStore } from '../services/session-store.js';
import { MySQLRateStore } from '../services/rate-store.js';
import { reconcileOrders } from '../services/maintenance.js';
import { createApp } from '../app.js';
import { readConfig } from '../config/env.js';
import bcrypt from 'bcrypt';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ensureCartEditable } from '../lib/cart-state.js';

// No imported application .env. Tests create and drop only a dedicated temporary DB.
const enabled = process.env.AIRBELL_TEST_DB === 'true';
let pool, admin;
const database = 'airbell_test_' + process.pid;
before(async () => {
  if (!enabled) return;
  admin = await mysql.createConnection({
    host: '127.0.0.1',
    port: Number(process.env.AIRBELL_TEST_DB_PORT || 3307),
    user: process.env.AIRBELL_TEST_DB_USER || 'root',
    password: process.env.AIRBELL_TEST_DB_PASSWORD || '',
  });
  await admin.query('CREATE DATABASE ' + database);
  pool = mysql.createPool({
    host: '127.0.0.1',
    port: Number(process.env.AIRBELL_TEST_DB_PORT || 3307),
    user: process.env.AIRBELL_TEST_DB_USER || 'root',
    password: process.env.AIRBELL_TEST_DB_PASSWORD || '',
    database,
    connectionLimit: 5,
    timezone: 'Z',
  });
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const statement of schema
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean))
    await pool.query(statement);
});
after(async () => {
  if (pool) await pool.end();
  if (admin) {
    await admin.query('DROP DATABASE ' + database);
    await admin.end();
  }
});
async function seed(stock = 1) {
  await pool.execute('DELETE FROM pedidos');
  await pool.execute('DELETE FROM carrito');
  await pool.execute('DELETE FROM productos');
  await pool.execute('DELETE FROM usuarios');
  await pool.execute(
    "INSERT INTO usuarios (id, nombre, email, password) VALUES (1, 'First', 'one@example.test', 'not-for-login'), (2, 'Second', 'two@example.test', 'not-for-login')",
  );
  await pool.execute(
    "INSERT INTO productos (id, nombre, marca, categoria, descripcion, precio, oferta, stock, imagen, sku, tamano) VALUES (1, 'Perfume', 'Test', 'Unisex', 'Test product', 123.45, 10, ?, 'test.webp', 'TEST', '100 ml')",
    [stock],
  );
  await pool.execute('INSERT INTO carrito (id_usuario, id_producto) VALUES (1, 1), (2, 1)');
}
test('competing purchases cannot reserve the final unit twice', { skip: !enabled }, async () => {
  await seed();
  const service = orderService(pool);
  const results = await Promise.allSettled([service.reserve(1), service.reserve(2)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const [[product]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
  assert.equal(product.stock, 0);
  const [[count]] = await pool.execute('SELECT COUNT(*) AS count FROM pedidos');
  assert.equal(Number(count.count), 1);
});
test(
  'repeated checkout returns same pending order; total uses DB prices and offers',
  { skip: !enabled },
  async () => {
    await seed(5);
    const service = orderService(pool);
    const first = await service.reserve(1);
    const second = await service.reserve(1);
    assert.equal(second.existing, true);
    assert.equal(first.order.id, second.order.id);
    assert.equal(Number(second.order.total_centavos), 11111);
    const [[product]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(product.stock, 4);
  },
);
test(
  'out-of-stock later item rolls back earlier stock decrements',
  { skip: !enabled },
  async () => {
    await seed(2);
    await pool.execute(
      "INSERT INTO productos (id, nombre, marca, categoria, descripcion, precio, oferta, stock, imagen, sku, tamano) VALUES (2, 'Unavailable', 'Test', 'Unisex', 'Test', 50, 0, 0, 'test.webp', 'TEST2', '50 ml')",
    );
    await pool.execute('INSERT INTO carrito (id_usuario, id_producto) VALUES (1, 2)');
    await assert.rejects(() => orderService(pool).reserve(1), /stock/);
    const [[product]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(product.stock, 2);
    const [[count]] = await pool.execute('SELECT COUNT(*) AS count FROM pedidos');
    assert.equal(Number(count.count), 0);
  },
);
test(
  'webhook retries are idempotent and clear only purchased cart rows',
  { skip: !enabled },
  async () => {
    await seed(5);
    const service = orderService(pool);
    const { order } = await service.reserve(1);
    await pool.execute('INSERT INTO carrito (id_usuario, id_producto) VALUES (1, 1)');
    const payment = {
      id: 123,
      status: 'approved',
      external_reference: order.id,
      currency_id: 'ARS',
      transaction_amount: 111.11,
    };
    await Promise.all([service.settle(payment), service.settle(payment)]);
    const [[saved]] = await pool.execute('SELECT estado FROM pedidos WHERE id = ?', [order.id]);
    assert.equal(saved.estado, 'paid');
    const [[product]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(product.stock, 4);
    const [[remaining]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM carrito WHERE id_usuario = 1',
    );
    assert.equal(Number(remaining.count), 1);
  },
);
test(
  'amount mismatch does not confirm purchase or change reservation',
  { skip: !enabled },
  async () => {
    await seed(2);
    const service = orderService(pool);
    const { order } = await service.reserve(1);
    await assert.rejects(
      () =>
        service.settle({
          id: 12,
          status: 'approved',
          external_reference: order.id,
          currency_id: 'ARS',
          transaction_amount: 0.01,
        }),
      /importe/,
    );
    const [[saved]] = await pool.execute('SELECT estado FROM pedidos WHERE id = ?', [order.id]);
    assert.equal(saved.estado, 'creating');
  },
);
test(
  'expiry releases once; late payment without stock requires review',
  { skip: !enabled },
  async () => {
    await seed(1);
    const service = orderService(pool);
    const first = await service.reserve(1);
    await Promise.all([service.release(first.order.id), service.release(first.order.id)]);
    const [[released]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(released.stock, 1);
    await service.reserve(2);
    await service.settle({
      id: 321,
      status: 'approved',
      external_reference: first.order.id,
      currency_id: 'ARS',
      transaction_amount: 111.11,
    });
    const [[saved]] = await pool.execute('SELECT estado FROM pedidos WHERE id = ?', [
      first.order.id,
    ]);
    assert.equal(saved.estado, 'paid_review');
    const [[product]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(product.stock, 0);
  },
);
test(
  'provider outage keeps reservations; verified empty results release expired orders',
  { skip: !enabled },
  async () => {
    await seed();
    const service = orderService(pool);
    const { order } = await service.reserve(1);
    await pool.execute(
      'UPDATE pedidos SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?',
      [order.id],
    );
    await reconcileOrders(
      pool,
      {
        search: async () => {
          throw new Error('provider unavailable');
        },
      },
      service,
    );
    const [[reserved]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(reserved.stock, 0);
    await reconcileOrders(pool, { search: async () => [] }, service);
    const [[released]] = await pool.execute('SELECT stock FROM productos WHERE id = 1');
    assert.equal(released.stock, 1);
  },
);
const storeCall = (store, method, ...args) =>
  new Promise((resolve, reject) =>
    store[method](...args, (error, value) => (error ? reject(error) : resolve(value))),
  );
test(
  'sessions persist across store instances, expire and never store raw SID',
  { skip: !enabled },
  async () => {
    const store = new MySQLSessionStore(pool);
    const value = { userId: 1, cookie: { expires: new Date(Date.now() + 60000).toISOString() } };
    await storeCall(store, 'set', 'raw-session-secret', value);
    assert.deepEqual(
      await storeCall(new MySQLSessionStore(pool), 'get', 'raw-session-secret'),
      value,
    );
    const [[row]] = await pool.execute('SELECT id FROM sesiones');
    assert.notEqual(row.id, 'raw-session-secret');
    await pool.execute('UPDATE sesiones SET expires_at = 0');
    assert.equal(await storeCall(store, 'get', 'raw-session-secret'), null);
  },
);
test(
  'rate limits are shared across instances and atomic under concurrency',
  { skip: !enabled },
  async () => {
    const stores = [new MySQLRateStore(pool, 'test'), new MySQLRateStore(pool, 'test')];
    for (const store of stores) store.init({ windowMs: 60000 });
    await Promise.all(
      Array.from({ length: 20 }, (_, index) => stores[index % 2].increment('127.0.0.1')),
    );
    const result = await stores[0].increment('127.0.0.1');
    assert.equal(result.totalHits, 21);
  },
);
test(
  'HTTP registration persists bcrypt, session works across servers and cart ownership is enforced',
  { skip: !enabled },
  async () => {
    await seed(10);
    const config = readConfig({
      SESSION_SECRET: 'isolated-db-test-secret-with-more-than-32-characters',
    });
    const servers = [];
    try {
      for (let index = 0; index < 2; index++) {
        const server = createApp({ pool, config }).listen(0, '127.0.0.1');
        await new Promise((resolve) => server.once('listening', resolve));
        servers.push(server);
      }
      const bases = servers.map((server) => 'http://127.0.0.1:' + server.address().port);
      const initial = await fetch(bases[0] + '/api/auth/session');
      let cookie = initial.headers.get('set-cookie').split(';')[0];
      let token = (await initial.json()).csrfToken;
      async function request(path, body, method = 'POST', base = bases[0]) {
        return fetch(base + path, {
          method,
          headers: {
            Cookie: cookie,
            Origin: config.frontendUrl,
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          body: method === 'GET' ? undefined : JSON.stringify(body),
        });
      }
      const registration = await request('/api/auth/register', {
        nombre: 'Customer',
        email: 'new@example.test',
        password: 'a-long-passphrase-2026',
        confirmpassword: 'a-long-passphrase-2026',
      });
      assert.equal(registration.status, 201);
      cookie = registration.headers.get('set-cookie').split(';')[0];
      const data = await registration.json();
      token = data.csrfToken;
      assert.equal(data.user.password, undefined);
      const [[saved]] = await pool.execute('SELECT password FROM usuarios WHERE id = ?', [
        data.user.id,
      ]);
      assert.match(saved.password, /^\$2b\$12\$/);
      assert.equal(await bcrypt.compare('a-long-passphrase-2026', saved.password), true);
      const restored = await request('/api/auth/session', undefined, 'GET', bases[1]);
      assert.equal((await restored.json()).user.id, data.user.id);
      assert.equal((await request('/api/cart', { id_producto: 1, cantidad: 2 })).status, 201);
      const ownCart = await request('/api/cart', undefined, 'GET');
      assert.equal((await ownCart.json())[0].cantidad, 2);
      const [[others]] = await pool.execute(
        'SELECT COUNT(*) AS count FROM carrito WHERE id_usuario = 2',
      );
      assert.equal(Number(others.count), 1);
      assert.equal((await request('/api/cart/1', { cantidad: 0 }, 'PATCH')).status, 200);
      const [[unchanged]] = await pool.execute(
        'SELECT COUNT(*) AS count FROM carrito WHERE id_usuario = 2',
      );
      assert.equal(Number(unchanged.count), 1);
      assert.equal((await request('/api/admin/products/1', {}, 'DELETE')).status, 403);
    } finally {
      await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    }
  },
);
test(
  'legacy schema migration is repeatable and plaintext migration preserves account IDs',
  { skip: !enabled },
  async () => {
    const migrationDatabase = 'airbell_test_migration_' + process.pid;
    await admin.query('CREATE DATABASE ' + migrationDatabase);
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: Number(process.env.AIRBELL_TEST_DB_PORT || 3307),
      user: process.env.AIRBELL_TEST_DB_USER || 'root',
      password: process.env.AIRBELL_TEST_DB_PASSWORD || '',
      database: migrationDatabase,
    });
    const scriptEnv = {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: process.env.AIRBELL_TEST_DB_PORT || '3307',
      DB_USER: process.env.AIRBELL_TEST_DB_USER || 'root',
      DB_PASSWORD: process.env.AIRBELL_TEST_DB_PASSWORD || '',
      DB_NAME: migrationDatabase,
      MYSQL_CA: '',
      MYSQL_CA_FILE: '',
    };
    const run = (script, args = []) =>
      promisify(execFile)(
        process.execPath,
        [fileURLToPath(new URL('../scripts/' + script, import.meta.url)), ...args],
        { env: scriptEnv },
      );
    try {
      await connection.query(
        "CREATE TABLE usuarios (id INT PRIMARY KEY, nombre VARCHAR(100), email VARCHAR(100), password VARCHAR(100), rol VARCHAR(30) DEFAULT 'usuario') ENGINE=InnoDB",
      );
      const hashed = await bcrypt.hash('existing-hashed-password', 10);
      await connection.execute(
        "INSERT INTO usuarios (id, nombre, email, password) VALUES (41, 'Old', 'old@example.test', ?), (42, 'Hashed', 'hashed@example.test', ?)",
        ['confirmed-legacy-plaintext', hashed],
      );
      await run('migrate.js');
      await run('migrate.js');
      const dry = await run('migrate-passwords.js');
      assert.equal(dry.stdout.includes('confirmed-legacy-plaintext'), false);
      const [[beforeRow]] = await connection.execute('SELECT password FROM usuarios WHERE id = 41');
      assert.equal(beforeRow.password, 'confirmed-legacy-plaintext');
      await run('migrate-passwords.js', ['--apply', '--plaintext-ids=41']);
      const [rows] = await connection.execute('SELECT id, password FROM usuarios ORDER BY id');
      assert.deepEqual(
        rows.map((row) => row.id),
        [41, 42],
      );
      assert.equal(await bcrypt.compare('confirmed-legacy-plaintext', rows[0].password), true);
      assert.equal(rows[1].password, hashed);
    } finally {
      await connection.end();
      await admin.query('DROP DATABASE ' + migrationDatabase);
    }
  },
);
test(
  'reserved checkout prevents cart changes until reservation is released',
  { skip: !enabled },
  async () => {
    await seed(3);
    const service = orderService(pool);
    const { order } = await service.reserve(1);
    await assert.rejects(() => ensureCartEditable(pool, 1), /pago en preparación/);
    await service.release(order.id);
    await ensureCartEditable(pool, 1);
  },
);
