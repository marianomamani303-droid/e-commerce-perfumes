import { z } from 'zod';
import { HttpError } from '../lib/errors.js';
import { verifyWebhook } from '../services/payments.js';
export function paymentController(pool, provider, orders, config) {
  return {
    checkout: async (req, res) => {
      z.object({}).strict().parse(req.body);
      provider.ready();
      const { order, existing } = await orders.reserve(req.user.id);
      if (existing) {
        if (order.checkout_url && new Date(order.expires_at).getTime() > Date.now())
          return res.json({ orderId: order.id, url: order.checkout_url });
        throw new HttpError(
          409,
          'Hay un pago en preparación. Esperá unos minutos antes de intentar nuevamente.',
        );
      }
      // Leave uncertain provider failures reserved; maintenance reconciles before release.
      const preference = await provider.create(order);
      await pool.execute(
        "UPDATE pedidos SET estado = 'pending', preference_id = ?, checkout_url = ? WHERE id = ? AND estado = 'creating'",
        [preference.id, preference.url, order.id],
      );
      res.status(201).json({ orderId: order.id, url: preference.url });
    },
    webhook: async (req, res) => {
      const id = verifyWebhook(req, config.webhookSecret);
      if (req.query.type && req.query.type !== 'payment') return res.sendStatus(204);
      const payment = await provider.get(id);
      await orders.settle(payment);
      res.sendStatus(204);
    },
    order: async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      const [[order]] = await pool.execute(
        'SELECT id, estado, total_centavos, created_at FROM pedidos WHERE id = ? AND id_usuario = ?',
        [id, req.user.id],
      );
      if (!order) throw new HttpError(404, 'Pedido no encontrado.');
      res.json({ ...order, total: Number(order.total_centavos) / 100 });
    },
  };
}
