import { z } from 'zod';
export const idSchema = z.coerce.number().int().positive().max(2147483647);
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresá un email válido.')
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, 'Usá una contraseña de al menos 12 caracteres.')
  .refine((x) => Buffer.byteLength(x, 'utf8') <= 72, 'La contraseña supera el límite de 72 bytes.');
export const registrationSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Ingresá tu nombre.').max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmpassword: z.string(),
  })
  .strict()
  .refine((x) => x.password === x.confirmpassword, 'Las contraseñas no coinciden.');
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(1)
      .refine(
        (x) => Buffer.byteLength(x, 'utf8') <= 72,
        'La contraseña supera el límite de 72 bytes.',
      ),
  })
  .strict();
const text = (max) => z.string().trim().min(1).max(max);
export const productSchema = z
  .object({
    nombre: text(150),
    marca: text(100),
    categoria: z.enum(['Femenino', 'Masculino', 'Unisex']),
    descripcion: text(4000),
    precio: z.coerce
      .number()
      .positive()
      .max(10000000)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
        'Usá hasta dos decimales.',
      ),
    oferta: z.coerce.number().int().min(0).max(90).default(0),
    stock: z.coerce.number().int().min(0).max(100000),
    sku: text(80),
    tamano: text(50),
  })
  .strict();
export const cartSchema = z
  .object({ id_producto: idSchema, cantidad: z.number().int().min(1).max(99).default(1) })
  .strict();
