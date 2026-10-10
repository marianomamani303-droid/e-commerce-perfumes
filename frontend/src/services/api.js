export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
let token = null;
let bootstrap = null;
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export function setCsrf(value) {
  token = value;
  bootstrap = null;
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  if (method !== 'GET' && !token) {
    bootstrap ||= api('/auth/session')
      .then((result) => {
        token = result.csrfToken;
      })
      .catch((error) => {
        bootstrap = null;
        throw error;
      });
    await bootstrap;
  }
  const isForm = body instanceof FormData;
  const response = await fetch(API_BASE + '/api' + path, {
    method,
    credentials: 'include',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRF-Token': token } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(data.message || 'No pudimos completar la solicitud.', response.status);
  return data;
}
export function productImage(product) {
  return product.demo
    ? '/images/editorial-hero.webp'
    : API_BASE + '/uploads/' + encodeURIComponent(product.imagen || 'missing');
}
export function readableError(error) {
  return ['TimeoutError', 'TypeError'].includes(error.name)
    ? 'No pudimos conectar con la tienda. Volvé a intentar en unos instantes.'
    : error.message;
}
