import pool from './config/config.js';
import { readConfig } from './config/env.js';
import { createApp } from './app.js';
import { paymentProvider } from './services/payments.js';
import { orderService } from './services/orders.js';
import { reconcileOrders } from './services/maintenance.js';

const config = readConfig();
await pool.execute('SELECT id FROM sesiones LIMIT 1');
const provider = paymentProvider(config);
const orders = orderService(pool);
const app = createApp({ pool, config, provider });
const server = app.listen(Number(process.env.PORT || 3000), () =>
  console.log('Airbell API disponible.'),
);
let running = false;
const interval = setInterval(async () => {
  if (running) return;
  running = true;
  try {
    await reconcileOrders(pool, provider, orders);
  } catch (error) {
    console.error('Mantenimiento fallido:', error.code || error.name);
  } finally {
    running = false;
  }
}, 60000);
interval.unref();
function shutdown() {
  clearInterval(interval);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
