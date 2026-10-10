export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message =
    status < 500 ? error.message : 'No pudimos completar la solicitud. Intentá nuevamente.';
  if (error.name === 'ZodError') {
    status = 400;
    message = error.issues[0]?.message || 'Datos inválidos.';
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'La imagen debe pesar menos de 5 MB.';
  }
  if (error.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'No pudimos guardar los datos. Revisá la información ingresada.';
  }
  if (status >= 500)
    console.error('Solicitud fallida:', { path: req.path, code: error.code || error.name });
  res.status(status).json({ message });
}
