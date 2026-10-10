# Auditoría y decisiones de seguridad

| Hallazgo original | Corrección |
| --- | --- |
| ID y rol de usuario en localStorage sin sesión verificable | Sesión en cookie HttpOnly; el usuario y su rol se consultan en el servidor |
| Rutas administrativas públicas | Autenticación y control de rol antes de recibir imágenes o cambiar productos |
| Carrito elegido por `id_usuario` del navegador | Propietario tomado de la sesión; cuerpos con identidad o precios se rechazan |
| Eliminación de filas del carrito sin propietario | Operaciones filtradas por usuario autenticado |
| Precio del pago recibido desde el frontend | Snapshot del carrito, precios y descuentos obtenidos de SQL, cálculo en centavos |
| Compra sin control de stock ni transacción | Reservas bajo `FOR UPDATE`, commit/rollback, aprobación idempotente |
| Pago sin verificación de proveedor | HMAC de webhook y consulta autenticada del pago, moneda e importe verificados |
| CORS abierto | Lista exacta de orígenes y credenciales |
| Sin protección CSRF | Token sincronizado en sesión más verificación de Origin para todas las mutaciones |
| Login sin limitación y errores que identificaban cuentas | Límites persistentes en MySQL y error genérico |
| Upload sin límites ni validación real | Límite de 5 MB, decodificación con sharp, límite de píxeles y reescritura WebP |
| Errores SQL y objetos internos devueltos al cliente | Manejador central, mensajes públicos limitados y logs sin cuerpos sensibles |
| Dependencias vulnerables | Lockfiles actualizados y auditoría sin hallazgos conocidos al finalizar |

## Contraseñas existentes

El registro original ya usaba bcrypt con costo 10; no se presume que todas las cuentas tengan ese formato. El nuevo registro usa costo 12 y rechaza más de 72 bytes UTF-8 para evitar truncamiento silencioso. El login incrementa el costo de hashes bcrypt válidos inferiores a 12 después de una verificación correcta. Nunca devuelve el hash.

`npm run migrate:passwords` solo lista IDs de formatos no reconocidos; no imprime contraseñas ni escribe. Tras confirmar manualmente qué cuentas contienen texto plano y respaldar la base, se puede ejecutar:

```powershell
npm run migrate:passwords -- --apply --plaintext-ids=41,52
```

La migración hashea únicamente esos IDs, conserva cuentas y utiliza actualizaciones condicionadas al valor original dentro de una transacción. Nunca convierte automáticamente un hash desconocido en la nueva contraseña. Los formatos incompatibles o contraseñas antiguas de más de 72 bytes requieren un procedimiento de recuperación administrado; el login falla de forma genérica hasta resolverlos. Eliminar copias de respaldo con texto plano según la política de retención del comercio.

## Sesiones y acceso

La cookie tiene `HttpOnly`, `SameSite=Lax` por defecto y `Secure` en producción; en HTTPS usa el prefijo `__Host-` y no define Domain. El ID de sesión se guarda como SHA-256 en SQL. Las sesiones autenticadas tienen una duración absoluta de ocho horas; se regeneran al entrar y se destruyen al salir. Los roles se leen nuevamente en cada ruta protegida.

Se exige token CSRF incluso para login, registro y logout. El frontend lo obtiene mediante `GET /api/auth/session` y lo conserva solo en memoria. Las notificaciones del proveedor están exentas de CSRF y protegidas por firma. El replay de una notificación válida no vuelve a descontar stock; no se exige una ventana temporal corta a la firma para permitir reintentos legítimos del proveedor.

## Compras y operación

Un solo pedido activo por usuario, serializado mediante bloqueo de su fila. Mientras tiene una reserva activa, el servidor impide modificar el carrito para mantenerlo consistente con el pedido. Las cantidades, descuentos y stock se validan en el servidor. Una aprobación elimina solo las filas del carrito incluidas en el snapshot del pedido.

El reconciliador conserva stock si no puede consultar al proveedor. No libera reservas basándose en una respuesta del navegador. Si una aprobación llega después de la liberación, vuelve a tomar bloqueos de stock; sin disponibilidad, marca `paid_review`. Ese caso, pagos duplicados de una misma orden, reembolsos y contracargos requieren revisión operativa del comercio. No despachar basándose únicamente en la existencia de un pago.

Los límites de solicitudes también están en MySQL, compartidos entre instancias. El API general permite 400 solicitudes por 15 minutos por IP; login y registro comparten 10, y checkout 8. Las ventanas son fijas y se limpian periódicamente. Si hay varios proxies, configurar `TRUST_PROXY` al número exacto; no usar confianza irrestricta.

## Alcance verificado

Pruebas HTTP con stores de memoria exclusivos de pruebas, pruebas de sesiones y límites persistentes en SQL, concurrencia de compra, rollback, aprobación repetida, importe incorrecto, expiración, migración de esquema repetida y preservación de cuentas. Browser QA con fixtures y axe. No se auditó el contenido de la base original, infraestructura desplegada ni una cuenta real de Mercado Pago. Las migraciones de la base original y la validación de credenciales se dejan explícitas para staging.

Documentación usada: [Express session](https://expressjs.com/en/resources/middleware/session/), [Helmet](https://github.com/helmetjs/helmet) y [notificaciones Checkout Pro de Mercado Pago](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications).
