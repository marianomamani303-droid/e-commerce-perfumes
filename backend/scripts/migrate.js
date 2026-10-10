import { readFile } from 'node:fs/promises';
import pool from '../config/config.js';
// MySQL DDL commits implicitly: run against a backup/staging first.
try {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const statement of sql
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean))
    await pool.query(statement);
  const [columns] = await pool.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos'",
  );
  if (!columns.some((x) => x.COLUMN_NAME === 'archivado'))
    await pool.query('ALTER TABLE productos ADD COLUMN archivado TINYINT NOT NULL DEFAULT 0');
  for (const table of ['usuarios', 'productos', 'carrito']) {
    const [[info]] = await pool.execute(
      'SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [table],
    );
    if (info.ENGINE !== 'InnoDB')
      throw new Error('Las tablas existentes deben usar InnoDB antes de habilitar compras.');
  }
  const [duplicates] = await pool.execute(
    'SELECT LOWER(TRIM(email)) AS email FROM usuarios GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1 LIMIT 1',
  );
  if (duplicates.length)
    throw new Error(
      'Hay emails duplicados. Resolverlos manualmente conservando las cuentas antes de continuar.',
    );
  await pool.query('ALTER TABLE usuarios MODIFY password VARCHAR(255) NOT NULL');
  await pool.query('UPDATE usuarios SET email = LOWER(TRIM(email))');
  const [indexes] = await pool.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND NON_UNIQUE = 0 GROUP BY INDEX_NAME HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = 'email'",
  );
  if (!indexes.length)
    await pool.query('ALTER TABLE usuarios ADD UNIQUE KEY usuarios_email_unique (email)');
  const [cartIndexes] = await pool.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'carrito' AND COLUMN_NAME = 'id_usuario'",
  );
  if (!cartIndexes.length)
    await pool.query(
      'ALTER TABLE carrito ADD KEY carrito_usuario_producto (id_usuario, id_producto)',
    );
  console.log('Migración de esquema completada; las cuentas y productos se conservaron.');
} catch (error) {
  console.error('Migración detenida:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
