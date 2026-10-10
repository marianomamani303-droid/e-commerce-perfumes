import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createHmac } from 'node:crypto';
import { safeEqual } from '../middleware/security.js';
import { HttpError } from '../lib/errors.js';

export function verifyWebhook(req, secret) {
  const id = req.query['data.id'];
  const requestId = req.get('x-request-id');
  const parts = Object.fromEntries(
    (req.get('x-signature') || '').split(',').map((x) => x.trim().split('=')),
  );
  if (
    !secret ||
    typeof id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(id) ||
    !requestId ||
    !/^\d{10,13}$/.test(parts.ts || '') ||
    !/^[a-f0-9]{64}$/.test(parts.v1 || '')
  )
    throw new HttpError(401, 'Notificación inválida.');
  const digest = createHmac('sha256', secret)
    .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`)
    .digest('hex');
  if (!safeEqual(digest, parts.v1)) throw new HttpError(401, 'Notificación inválida.');
  return id;
}
export function paymentProvider(config) {
  let preference, payment;
  function ready() {
    if (
      !config.mpToken ||
      !config.webhookSecret ||
      !config.publicApiUrl?.startsWith('https://') ||
      !config.frontendUrl.startsWith('https://')
    )
      throw new HttpError(503, 'Los pagos todavía no están habilitados.');
    if (!preference) {
      const client = new MercadoPagoConfig({
        accessToken: config.mpToken,
        options: { timeout: 10000 },
      });
      preference = new Preference(client);
      payment = new Payment(client);
    }
  }
  return {
    ready,
    create: async (order) => {
      ready();
      const items = JSON.parse(order.items).map((item) => ({
        id: String(item.id_producto),
        title: item.nombre,
        quantity: item.cantidad,
        unit_price: item.precio_centavos / 100,
        currency_id: 'ARS',
      }));
      const result = await preference.create({
        body: {
          items,
          external_reference: order.id,
          binary_mode: true,
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(order.expires_at).toISOString(),
          back_urls: {
            success: config.frontendUrl + '/?pedido=' + order.id,
            failure: config.frontendUrl + '/?pedido=' + order.id,
            pending: config.frontendUrl + '/?pedido=' + order.id,
          },
          auto_return: 'approved',
          notification_url: config.publicApiUrl.replace(/\/$/, '') + '/api/payments/webhook',
        },
        requestOptions: { idempotencyKey: order.id },
      });
      const url = config.mpTest ? result.sandbox_init_point : result.init_point;
      const parsed = new URL(url);
      if (
        parsed.protocol !== 'https:' ||
        !/(^|\.)mercadopago\.(com|com\.ar)$/.test(parsed.hostname)
      )
        throw new Error('Invalid payment URL');
      return { id: result.id, url };
    },
    get: async (id) => {
      ready();
      return payment.get({ id });
    },
    search: async (reference) => {
      ready();
      const result = await payment.search({
        options: {
          external_reference: reference,
          sort: 'date_created',
          criteria: 'desc',
          limit: 100,
        },
      });
      return result.results || [];
    },
  };
}
