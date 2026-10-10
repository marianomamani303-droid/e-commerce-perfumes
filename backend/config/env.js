import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
export function readConfig(source = process.env) {
  const production = source.NODE_ENV === 'production';
  const origins = (source.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((x) => x.trim());
  if (!source.SESSION_SECRET || source.SESSION_SECRET.length < 32)
    throw new Error('SESSION_SECRET debe contener al menos 32 caracteres aleatorios.');
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || (production && url.protocol !== 'https:'))
      throw new Error('FRONTEND_ORIGIN debe contener orígenes exactos; HTTPS en producción.');
  }
  const sameSite = source.COOKIE_SAME_SITE || 'lax';
  if (!['lax', 'strict', 'none'].includes(sameSite) || (sameSite === 'none' && !production))
    throw new Error('COOKIE_SAME_SITE inválido; none requiere HTTPS en producción.');
  const trustProxy = Number(source.TRUST_PROXY || 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 5)
    throw new Error('TRUST_PROXY inválido.');
  return {
    production,
    origins,
    sameSite,
    trustProxy,
    secret: source.SESSION_SECRET,
    cookieName: production ? '__Host-airbell.sid' : 'airbell.sid',
    sessionMs: 8 * 60 * 60 * 1000,
    frontendUrl: origins[0],
    publicApiUrl: source.PUBLIC_API_URL,
    mpToken: source.MP_ACCESS_TOKEN,
    webhookSecret: source.MP_WEBHOOK_SECRET,
    mpTest: source.MP_TEST_MODE === 'true',
  };
}
