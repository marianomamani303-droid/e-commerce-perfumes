import multer from 'multer';
import { HttpError } from '../lib/errors.js';
export default multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 16000 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      return callback(new HttpError(400, 'Usá una imagen JPG, PNG o WebP.'));
    callback(null, true);
  },
});
