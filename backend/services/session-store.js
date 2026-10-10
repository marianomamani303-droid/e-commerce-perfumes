import session from 'express-session';
import { createHash } from 'node:crypto';
const key = (sid) => createHash('sha256').update(sid).digest('hex');
export class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
  }
  get(sid, callback) {
    this.pool
      .execute('SELECT data FROM sesiones WHERE id = ? AND expires_at > ?', [key(sid), Date.now()])
      .then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].data) : null))
      .catch(callback);
  }
  set(sid, value, callback = () => {}) {
    this.pool
      .execute(
        'INSERT INTO sesiones (id, data, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)',
        [key(sid), JSON.stringify(value), new Date(value.cookie.expires).getTime()],
      )
      .then(() => callback())
      .catch(callback);
  }
  destroy(sid, callback = () => {}) {
    this.pool
      .execute('DELETE FROM sesiones WHERE id = ?', [key(sid)])
      .then(() => callback())
      .catch(callback);
  }
  touch(sid, value, callback = () => {}) {
    this.pool
      .execute('UPDATE sesiones SET expires_at = ? WHERE id = ?', [
        new Date(value.cookie.expires).getTime(),
        key(sid),
      ])
      .then(() => callback())
      .catch(callback);
  }
}
