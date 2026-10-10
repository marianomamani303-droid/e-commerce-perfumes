import { HttpError } from './errors.js';
export function cents(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 10000000)
    throw new HttpError(409, 'El producto tiene un precio inválido.');
  return Math.round(number * 100);
}
export function priceCents(product) {
  const discount = Number(product.oferta || 0);
  if (!Number.isInteger(discount) || discount < 0 || discount > 90)
    throw new HttpError(409, 'El producto tiene una oferta inválida.');
  return Math.round((cents(product.precio) * (100 - discount)) / 100);
}
export function publicProduct(product) {
  return {
    ...product,
    precio: cents(product.precio) / 100,
    precio_final: priceCents(product) / 100,
    stock: Number(product.stock),
    oferta: Number(product.oferta || 0),
  };
}
