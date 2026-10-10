export async function reconcileOrders(pool, provider, orders) {
  const [rows] = await pool.execute(
    "SELECT id FROM pedidos WHERE estado IN ('creating', 'pending') AND expires_at < UTC_TIMESTAMP() ORDER BY created_at LIMIT 25",
  );
  for (const row of rows) {
    try {
      const payments = await provider.search(row.id);
      const approved = payments.find((payment) => payment.status === 'approved');
      if (approved) await orders.settle(approved);
      else if (
        !payments.some((payment) =>
          ['pending', 'in_process', 'authorized'].includes(payment.status),
        )
      )
        await orders.release(row.id);
    } catch (error) {
      // Fail closed: never release reservations while the provider cannot be checked.
      console.error('No se pudo conciliar pedido:', { id: row.id, code: error.code || error.name });
    }
  }
  await pool.execute('DELETE FROM sesiones WHERE expires_at < ?', [Date.now()]);
  await pool.execute('DELETE FROM limites WHERE expires_at < ?', [Date.now()]);
}
