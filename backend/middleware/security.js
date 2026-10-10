import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../lib/errors.js';
export function csrfToken(req) {
  req.session.csrf ||= randomBytes(32).toString('hex');
  return req.session.csrf;
}
export const safeEqual = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function csrfProtection(origins) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (
      !origins.includes(req.get('origin')) ||
      !safeEqual(req.get('x-csrf-token'), req.session.csrf)
    )
      throw new HttpError(403, 'La solicitud no es válida. Recargá la página.');
    next();
  };
}
export function authentication(pool) {
  return async (req, res, next) => {
    if (!req.session.userId || !req.session.authExpires || req.session.authExpires <= Date.now())
      throw new HttpError(401, 'Iniciá sesión para continuar.');
    const [[user]] = await pool.execute(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
      [req.session.userId],
    );
    if (!user) throw new HttpError(401, 'Iniciá sesión para continuar.');
    req.user = user;
    next();
  };
}
export function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin')
    throw new HttpError(403, 'No tenés permiso para realizar esta operación.');
  next();
}
