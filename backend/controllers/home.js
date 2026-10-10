import { z } from 'zod';
import { cartSchema, idSchema } from '../lib/validation.js';
import { publicProduct } from '../lib/money.js';
import { HttpError } from '../lib/errors.js';
import { transaction } from '../lib/transaction.js';
import { ensureCartEditable } from '../lib/cart-state.js';
export function homeController(pool) {
  async function cart(userId) {
    const [rows] = await pool.execute(
      'SELECT p.*, COUNT(c.id) AS cantidad FROM carrito c JOIN productos p ON p.id = c.id_producto WHERE c.id_usuario = ? GROUP BY p.id ORDER BY p.id',
      [userId],
    );
    return rows.map(publicProduct);
  }
  return {
    products: async (req, res) => {
      const [rows] = await pool.execute(
        'SELECT * FROM productos WHERE archivado = 0 ORDER BY id DESC',
      );
      res.json(rows.map(publicProduct));
    },
    product: async (req, res) => {
      const [[row]] = await pool.execute('SELECT * FROM productos WHERE id = ? AND archivado = 0', [
        idSchema.parse(req.params.id),
      ]);
      if (!row) throw new HttpError(404, 'No encontramos ese perfume.');
      res.json(publicProduct(row));
    },
    cart: async (req, res) => res.json(await cart(req.user.id)),
    add: async (req, res) => {
      const data = cartSchema.parse(req.body);
      await transaction(pool, async (connection) => {
        await connection.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [req.user.id]);
        await ensureCartEditable(connection, req.user.id);
        const [[product]] = await connection.execute(
          'SELECT stock, archivado FROM productos WHERE id = ? FOR UPDATE',
          [data.id_producto],
        );
        if (!product || product.archivado) throw new HttpError(404, 'Producto no disponible.');
        const [[count]] = await connection.execute(
          'SELECT COUNT(*) AS cantidad FROM carrito WHERE id_usuario = ? AND id_producto = ?',
          [req.user.id, data.id_producto],
        );
        const next = Number(count.cantidad) + data.cantidad;
        if (next > product.stock || next > 99)
          throw new HttpError(409, 'No hay stock suficiente para esa cantidad.');
        const [[all]] = await connection.execute(
          'SELECT COUNT(*) AS cantidad FROM carrito WHERE id_usuario = ?',
          [req.user.id],
        );
        if (Number(all.cantidad) + data.cantidad > 200)
          throw new HttpError(409, 'Tu carrito alcanzó el límite de productos.');
        for (let i = 0; i < data.cantidad; i++)
          await connection.execute('INSERT INTO carrito (id_usuario, id_producto) VALUES (?, ?)', [
            req.user.id,
            data.id_producto,
          ]);
      });
      res.status(201).json(await cart(req.user.id));
    },
    quantity: async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const { cantidad } = z
        .object({ cantidad: z.number().int().min(0).max(99) })
        .strict()
        .parse(req.body);
      await transaction(pool, async (connection) => {
        await connection.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [req.user.id]);
        await ensureCartEditable(connection, req.user.id);
        const [[product]] = await connection.execute(
          'SELECT stock, archivado FROM productos WHERE id = ? FOR UPDATE',
          [id],
        );
        if (cantidad && (!product || product.archivado || cantidad > product.stock))
          throw new HttpError(409, 'No hay stock suficiente.');
        const [rows] = await connection.execute(
          'SELECT id FROM carrito WHERE id_usuario = ? AND id_producto = ? ORDER BY id',
          [req.user.id, id],
        );
        if (!rows.length) throw new HttpError(404, 'Producto no encontrado en tu carrito.');
        const [[count]] = await connection.execute(
          'SELECT COUNT(*) AS cantidad FROM carrito WHERE id_usuario = ?',
          [req.user.id],
        );
        if (Number(count.cantidad) - rows.length + cantidad > 200)
          throw new HttpError(409, 'Tu carrito alcanzó el límite.');
        if (cantidad < rows.length) {
          for (const row of rows.slice(cantidad))
            await connection.execute('DELETE FROM carrito WHERE id = ? AND id_usuario = ?', [
              row.id,
              req.user.id,
            ]);
        } else {
          for (let i = rows.length; i < cantidad; i++)
            await connection.execute(
              'INSERT INTO carrito (id_usuario, id_producto) VALUES (?, ?)',
              [req.user.id, id],
            );
        }
      });
      res.json(await cart(req.user.id));
    },
    clear: async (req, res) => {
      await transaction(pool, async (connection) => {
        await connection.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [req.user.id]);
        await ensureCartEditable(connection, req.user.id);
        await connection.execute('DELETE FROM carrito WHERE id_usuario = ?', [req.user.id]);
      });
      res.sendStatus(204);
    },
  };
}
