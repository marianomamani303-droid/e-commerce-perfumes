import { randomUUID } from 'node:crypto';
import { transaction } from '../lib/transaction.js';
import { HttpError } from '../lib/errors.js';
import { priceCents } from '../lib/money.js';

export function orderService(pool) {
  async function reserve(userId) {
    return transaction(pool, async (connection) => {
      await connection.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [userId]);
      const [[active]] = await connection.execute(
        "SELECT * FROM pedidos WHERE id_usuario = ? AND estado IN ('creating', 'pending') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [userId],
      );
      if (active) return { order: active, existing: true };
      const [cart] = await connection.execute(
        'SELECT id, id_producto FROM carrito WHERE id_usuario = ? ORDER BY id_producto, id FOR UPDATE',
        [userId],
      );
      if (!cart.length) throw new HttpError(409, 'Tu carrito está vacío.');
      if (cart.length > 200) throw new HttpError(409, 'El carrito supera el límite de productos.');
      const groups = new Map();
      for (const row of cart) {
        const ids = groups.get(row.id_producto) || [];
        ids.push(row.id);
        groups.set(row.id_producto, ids);
      }
      const items = [];
      let total = 0;
      for (const [id, ids] of groups) {
        const [[product]] = await connection.execute(
          'SELECT * FROM productos WHERE id = ? FOR UPDATE',
          [id],
        );
        if (!product || product.archivado || ids.length > Number(product.stock) || ids.length > 99)
          throw new HttpError(409, 'Un producto ya no tiene stock suficiente. Revisá tu carrito.');
        const unit = priceCents(product);
        total += unit * ids.length;
        items.push({
          id_producto: id,
          nombre: product.nombre,
          cantidad: ids.length,
          precio_centavos: unit,
          cart_ids: ids,
        });
        await connection.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [
          ids.length,
          id,
        ]);
      }
      const id = randomUUID();
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      await connection.execute(
        "INSERT INTO pedidos (id, id_usuario, estado, total_centavos, items, expires_at) VALUES (?, ?, 'creating', ?, ?, ?)",
        [id, userId, total, JSON.stringify(items), expires],
      );
      return {
        order: {
          id,
          id_usuario: userId,
          total_centavos: total,
          items: JSON.stringify(items),
          expires_at: expires,
        },
        existing: false,
      };
    });
  }
  async function release(id, reason = 'expired') {
    return transaction(pool, async (connection) => {
      const [[order]] = await connection.execute('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [
        id,
      ]);
      if (!order || !['creating', 'pending'].includes(order.estado)) return;
      const items = JSON.parse(order.items);
      for (const item of items)
        await connection.execute('UPDATE productos SET stock = stock + ? WHERE id = ?', [
          item.cantidad,
          item.id_producto,
        ]);
      await connection.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [reason, id]);
    });
  }
  async function settle(payment) {
    if (payment.status !== 'approved') return;
    return transaction(pool, async (connection) => {
      const [[order]] = await connection.execute('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [
        payment.external_reference,
      ]);
      if (!order) throw new HttpError(404, 'Pedido no encontrado.');
      if (
        payment.currency_id !== 'ARS' ||
        Math.round(Number(payment.transaction_amount) * 100) !== Number(order.total_centavos)
      )
        throw new HttpError(409, 'El importe del pago no coincide con el pedido.');
      if (order.estado === 'paid' || order.estado === 'paid_review') {
        if (String(order.payment_id) !== String(payment.id))
          throw new HttpError(409, 'Pago duplicado: requiere revisión del comercio.');
        return;
      }
      const items = JSON.parse(order.items);
      let state = 'paid';
      // An approval can arrive after expiry. Lock and recheck stock before fulfillment.
      if (!['creating', 'pending'].includes(order.estado)) {
        const products = [];
        for (const item of items) {
          const [[product]] = await connection.execute(
            'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
            [item.id_producto],
          );
          products.push(product);
        }
        if (
          products.some(
            (product, index) => !product || Number(product.stock) < items[index].cantidad,
          )
        )
          state = 'paid_review';
        else
          for (const item of items)
            await connection.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [
              item.cantidad,
              item.id_producto,
            ]);
      }
      await connection.execute('UPDATE pedidos SET estado = ?, payment_id = ? WHERE id = ?', [
        state,
        String(payment.id),
        order.id,
      ]);
      for (const item of items)
        for (const cartId of item.cart_ids)
          await connection.execute('DELETE FROM carrito WHERE id = ? AND id_usuario = ?', [
            cartId,
            order.id_usuario,
          ]);
    });
  }
  return { reserve, release, settle };
}
