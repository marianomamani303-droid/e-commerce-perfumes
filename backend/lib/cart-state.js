import { HttpError } from './errors.js';
// The reserved order is an immutable snapshot. Keep the visible cart consistent with it.
export async function ensureCartEditable(connection, userId) {
  const [orders] = await connection.execute(
    "SELECT id FROM pedidos WHERE id_usuario = ? AND estado IN ('creating', 'pending') LIMIT 1",
    [userId],
  );
  if (orders.length)
    throw new HttpError(
      409,
      'Tenés un pago en preparación. Terminá ese pago o esperá a que venza para modificar tu selección.',
    );
}
