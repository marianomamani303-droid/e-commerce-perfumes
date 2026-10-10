import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { productSchema, idSchema } from '../lib/validation.js';
import { HttpError } from '../lib/errors.js';
import { publicProduct } from '../lib/money.js';
export const uploadsDirectory = fileURLToPath(new URL('../uploads', import.meta.url));
export function adminController(pool) {
  return {
    list: async (req, res) => {
      const [rows] = await pool.execute(
        'SELECT * FROM productos WHERE archivado = 0 ORDER BY id DESC',
      );
      res.json(rows.map(publicProduct));
    },
    create: async (req, res) => {
      const data = productSchema.parse(req.body);
      if (!req.file) throw new HttpError(400, 'La imagen es obligatoria.');
      let image;
      try {
        image = await sharp(req.file.buffer, { limitInputPixels: 25000000 })
          .rotate()
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 84 })
          .toBuffer();
      } catch {
        throw new HttpError(400, 'El archivo no es una imagen válida.');
      }
      const filename = randomUUID() + '.webp';
      await mkdir(uploadsDirectory, { recursive: true });
      await writeFile(path.join(uploadsDirectory, filename), image, { flag: 'wx' });
      try {
        const [result] = await pool.execute(
          'INSERT INTO productos (nombre, marca, categoria, descripcion, precio, oferta, stock, imagen, sku, tamano) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            data.nombre,
            data.marca,
            data.categoria,
            data.descripcion,
            data.precio,
            data.oferta,
            data.stock,
            filename,
            data.sku,
            data.tamano,
          ],
        );
        res.status(201).json({ id: result.insertId, message: 'Producto publicado.' });
      } catch (error) {
        await unlink(path.join(uploadsDirectory, filename)).catch(() => {});
        throw error;
      }
    },
    archive: async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const [result] = await pool.execute(
        'UPDATE productos SET archivado = 1 WHERE id = ? AND archivado = 0',
        [id],
      );
      if (!result.affectedRows) throw new HttpError(404, 'Producto no encontrado.');
      res.sendStatus(204);
    },
  };
}
