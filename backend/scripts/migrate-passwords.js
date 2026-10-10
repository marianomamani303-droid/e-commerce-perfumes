import bcrypt from 'bcrypt';
import pool from '../config/config.js';
import { bcryptPattern } from '../controllers/auth.js';
import { transaction } from '../lib/transaction.js';

// Dry run by default. Explicit IDs avoid guessing whether an unknown value is plaintext.
const write = process.argv.includes('--apply');
const argument = process.argv.find((x) => x.startsWith('--plaintext-ids='));
const ids = new Set((argument?.split('=')[1] || '').split(',').filter(Boolean).map(Number));
if ([...ids].some((x) => !Number.isSafeInteger(x) || x < 1)) throw new Error('IDs inválidos.');
try {
  const [rows] = await pool.execute('SELECT id, password FROM usuarios');
  const unknown = rows.filter((row) => !bcryptPattern.test(row.password));
  console.log(
    'Cuentas con formato no reconocido (solo IDs):',
    unknown.map((row) => row.id),
  );
  const selected = unknown.filter((row) => ids.has(row.id));
  if (selected.some((row) => Buffer.byteLength(row.password, 'utf8') > 72))
    throw new Error(
      'Una contraseña excede 72 bytes: requiere recuperación de cuenta, no truncamiento.',
    );
  if (!write)
    console.log(
      'Auditoría sin escrituras. Confirmá qué IDs contienen texto plano antes de usar --apply --plaintext-ids=1,2.',
    );
  else {
    if (!selected.length)
      throw new Error('No se seleccionaron cuentas con texto plano confirmado.');
    const hashes = await Promise.all(
      selected.map(async (row) => ({ ...row, hash: await bcrypt.hash(row.password, 12) })),
    );
    await transaction(pool, async (connection) => {
      for (const row of hashes)
        await connection.execute('UPDATE usuarios SET password = ? WHERE id = ? AND password = ?', [
          row.hash,
          row.id,
          row.password,
        ]);
    });
    console.log(
      'Contraseñas migradas sin cambiar IDs:',
      selected.map((row) => row.id),
    );
  }
} catch (error) {
  console.error('Migración detenida:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
