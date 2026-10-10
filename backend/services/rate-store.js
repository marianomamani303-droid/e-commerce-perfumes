import { createHash } from 'node:crypto';
// Fixed windows shared by instances; no IP addresses stored in plaintext.
export class MySQLRateStore {
  constructor(pool, prefix) {
    this.pool = pool;
    this.prefix = prefix;
    this.localKeys = false;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  key(value) {
    return createHash('sha256')
      .update(`${this.prefix}:${Math.floor(Date.now() / this.windowMs)}:${value}`)
      .digest('hex');
  }
  async increment(value) {
    const key = this.key(value);
    const reset = (Math.floor(Date.now() / this.windowMs) + 1) * this.windowMs;
    await this.pool.execute(
      'INSERT INTO limites (id, hits, expires_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE hits = hits + 1',
      [key, reset],
    );
    const [[row]] = await this.pool.execute('SELECT hits FROM limites WHERE id = ?', [key]);
    return { totalHits: Number(row.hits), resetTime: new Date(reset) };
  }
  async decrement(value) {
    await this.pool.execute('UPDATE limites SET hits = GREATEST(0, hits - 1) WHERE id = ?', [
      this.key(value),
    ]);
  }
  async resetKey(value) {
    await this.pool.execute('DELETE FROM limites WHERE id = ?', [this.key(value)]);
  }
}
