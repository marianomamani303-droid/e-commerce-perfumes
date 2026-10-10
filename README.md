# Airbell · Parfumerie

E-commerce de perfumes con React 19, Vite, Express 5, MySQL y Checkout Pro de Mercado Pago. El rediseño conserva las funcionalidades originales: colección, detalle de producto, registro e inicio de sesión, carrito y administración de productos.

## Ver el diseño sin configurar servicios

Requiere Node.js 20.19 o superior.

```powershell
cd frontend
npm ci
npm run demo
```

Abrí la URL que imprime Vite, normalmente `http://127.0.0.1:5173`. La demostración muestra un aviso visible, productos ficticios y compras deshabilitadas. No reemplaza errores de la API con datos inventados. Para generar una versión estática de presentación: `npm run build:demo`.

## Ejecutar la tienda real

1. Instalá dependencias con `npm ci` en `backend` y `frontend`.
2. Configurá `backend/.env` usando `backend/.env.example`. Si ya existe, conservá sus valores y agregá las variables nuevas. Generá `SESSION_SECRET` con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Nunca lo agregues al repositorio.
3. Configurá MySQL con una base dedicada. Hacé un respaldo antes de migrar una base existente y probá primero sobre una copia.
4. Desde `backend`, ejecutá `npm run migrate`. Agrega tablas de sesiones, límites y pedidos, y permite archivar productos; conserva IDs y datos existentes. Las tablas originales deben usar InnoDB. Los emails duplicados requieren resolución manual antes de habilitar la tienda.
5. Ejecutá `npm run migrate:passwords` para auditar formatos sin modificar contraseñas. Para cuentas cuyo texto plano haya sido confirmado, consultá [la guía de seguridad](docs/SECURITY.md) antes de aplicar la migración explícita.
6. Ejecutá `npm run dev` en `backend`. En otra terminal, ejecutá `npm run dev` en `frontend`.

Por defecto el frontend utiliza `/api` y `/uploads`, que Vite redirige a `127.0.0.1:3000`. Usá `http://localhost:5173` en el navegador, o agregá `http://127.0.0.1:5173` a `FRONTEND_ORIGIN` si preferís esa dirección. No mezcles `localhost` y `127.0.0.1` durante una sesión. El servidor rechaza cookies de autenticación sin un secreto válido y no arranca hasta que exista la tabla de sesiones.

La cuenta administradora debe recibir `rol = 'admin'` mediante una operación controlada en la base de datos. El registro público no admite roles. Las cuentas administrativas existentes se conservan. El panel permite publicar y archivar productos; no incorpora una función de edición que no existía en el servidor original.

## Producción y pagos

Recomendado: servir frontend y API desde el mismo origen HTTPS, con un proxy que envíe `/api/*` y `/uploads/*` al backend antes del fallback de la SPA. Configurá `NODE_ENV=production`, `FRONTEND_ORIGIN` exacto y `TRUST_PROXY` según los saltos reales del proxy. Para la base remota usá `MYSQL_CA` o `MYSQL_CA_FILE` y validación del certificado.

Para habilitar Mercado Pago necesitás `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PUBLIC_API_URL` HTTPS y un `FRONTEND_ORIGIN` HTTPS. Probá con cuentas y credenciales de prueba y `MP_TEST_MODE=true`. Registrá `/api/payments/webhook` para el evento `payment` en Mercado Pago. El navegador nunca confirma un pedido: el servidor valida la firma y consulta el pago al proveedor. No se realizaron cobros ni llamadas a una cuenta real durante la implementación.

El stock se reserva durante 30 minutos dentro de una transacción. Un proceso cada minuto consulta los pagos antes de liberar reservas vencidas. Si Mercado Pago no responde o informa un pago pendiente, conserva la reserva. Los pagos aprobados tardíamente vuelven a verificar disponibilidad; si no alcanza el stock, el estado `paid_review` exige intervención del comercio antes de entregar o reembolsar. Los reembolsos, contracargos, envíos y recuperación de contraseña no tienen un flujo comercial implementado en este proyecto.

Si desplegás la API en otro origen, configurá `VITE_API_BASE`, el origen autorizado del frontend, `COOKIE_SAME_SITE` según si son del mismo sitio y las directivas `connect-src`/`img-src` de `frontend/public/_headers`. `SameSite=None` requiere cookies Secure y HTTPS; los navegadores pueden bloquear cookies de terceros, por lo que conviene mantener el mismo sitio. `_headers` se aplica en hosts compatibles, como Netlify; en otros servidores hay que configurar esas cabeceras allí.

Guardá `backend/uploads` en un volumen persistente. Un disco efímero perdería las fotografías al reiniciar el servicio. Usá un usuario de base con permisos de aplicación; reservá los permisos DDL para la migración.

## Validación

```powershell
cd backend
npm test
cd ../frontend
npm test
npm run build
npm audit
```

Las pruebas del frontend usan Playwright y Edge por defecto en Windows. Para otro navegador configurá `PLAYWRIGHT_CHANNEL` o quitá `channel` en `playwright.config.js` y ejecutá `npx playwright install chromium`. Cubren catálogo, filtros, registro, carrito, errores, permisos visuales, desbordamientos y accesibilidad automatizada con axe en 320, 375, 768 y 1440 px. Las APIs de esas pruebas se interceptan con fixtures; no simulan un cobro real.

Las pruebas de base requieren una instancia descartable en `127.0.0.1:3307`:

```powershell
cd backend
$env:AIRBELL_TEST_DB = 'true'
# Si corresponde: AIRBELL_TEST_DB_PORT, AIRBELL_TEST_DB_USER, AIRBELL_TEST_DB_PASSWORD
npm test
```

Crean y eliminan únicamente bases `airbell_test_<PID>` y `airbell_test_migration_<PID>`. No leen las credenciales de la aplicación. Sin esa variable, las pruebas de integración de base se omiten y las de seguridad HTTP siguen ejecutándose.

Validación de esta entrega: 24 pruebas backend y 10 pruebas de navegador aprobadas, incluida una instancia local aislada de MariaDB 11.4 compatible con el protocolo MySQL. El build de producción y las auditorías de dependencias de ambos paquetes pasaron. La base original no fue modificada. La compatibilidad del esquema original y el pago real deben verificarse en staging antes del despliegue.

## Organización

```text
backend/
  config/        entorno, pool y recepción de imágenes
  controllers/   contratos HTTP
  middleware/    sesión, CSRF y permisos
  services/      sesiones, límites, pagos y pedidos
  lib/           validación, importes y transacciones
  db/            esquema inicial
  scripts/       migraciones explícitas
  tests/         seguridad HTTP e integración SQL
frontend/src/
  components/    navegación, tarjetas, carrito y feedback
  context/       sesión y operaciones de la selección
  hooks/         consulta de recursos cancelable
  pages/         pantallas existentes
  services/      cliente API único con cookies y CSRF
  utils/         formato de precios
  data/          fixtures de demostración explícita
  css/           identidad visual y responsive
```

Se consolidaron estilos duplicados y se eliminó el SDK de pagos del frontend: Checkout Pro abre una URL emitida por el servidor. La foto editorial está optimizada a WebP; su prompt y procedencia están en [ASSETS.md](docs/ASSETS.md). La carga de productos utiliza las fotografías reales del catálogo, con un fallback accesible cuando faltan.
