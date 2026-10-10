import bcrypt from 'bcrypt';
import { promisify } from 'node:util';
import { registrationSchema, loginSchema } from '../lib/validation.js';
import { HttpError } from '../lib/errors.js';
import { csrfToken } from '../middleware/security.js';
export const bcryptPattern = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;
const publicUser = (user) => ({
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol,
});
export function authController(pool, config) {
  const dummy = bcrypt.hash('dummy-password-not-an-account', 12);
  async function establish(req, user) {
    await promisify(req.session.regenerate).call(req.session);
    req.session.userId = user.id;
    req.session.authExpires = Date.now() + config.sessionMs;
    const token = csrfToken(req);
    await promisify(req.session.save).call(req.session);
    return { user: publicUser(user), csrfToken: token };
  }
  return {
    session: async (req, res) => {
      let user = null;
      if (req.session.userId && req.session.authExpires > Date.now()) {
        const [[row]] = await pool.execute(
          'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
          [req.session.userId],
        );
        user = row ? publicUser(row) : null;
      }
      res.json({ user, csrfToken: csrfToken(req) });
    },
    register: async (req, res) => {
      const data = registrationSchema.parse(req.body);
      const hash = await bcrypt.hash(data.password, 12);
      const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [
        data.email,
      ]);
      if (existing.length)
        throw new HttpError(
          409,
          'No pudimos crear la cuenta con esos datos. Si ya tenés una cuenta, iniciá sesión.',
        );
      const [result] = await pool.execute(
        'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
        [data.nombre, data.email, hash],
      );
      res.status(201).json(
        await establish(req, {
          id: result.insertId,
          nombre: data.nombre,
          email: data.email,
          rol: 'usuario',
        }),
      );
    },
    login: async (req, res) => {
      const data = loginSchema.parse(req.body);
      const [[user]] = await pool.execute(
        'SELECT id, nombre, email, rol, password FROM usuarios WHERE email = ?',
        [data.email],
      );
      const hash = user && bcryptPattern.test(user.password) ? user.password : await dummy;
      const valid = await bcrypt.compare(data.password, hash);
      if (!user || !bcryptPattern.test(user.password) || !valid)
        throw new HttpError(401, 'Email o contraseña incorrectos.');
      if (bcrypt.getRounds(user.password) < 12)
        await pool.execute('UPDATE usuarios SET password = ? WHERE id = ? AND password = ?', [
          await bcrypt.hash(data.password, 12),
          user.id,
          user.password,
        ]);
      res.json(await establish(req, user));
    },
    logout: async (req, res) => {
      await promisify(req.session.destroy).call(req.session);
      res.clearCookie(config.cookieName, {
        path: '/',
        httpOnly: true,
        secure: config.production,
        sameSite: config.sameSite,
      });
      res.sendStatus(204);
    },
  };
}
