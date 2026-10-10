import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import { authController } from './controllers/auth.js';
import { homeController } from './controllers/home.js';
import { adminController, uploadsDirectory } from './controllers/admin.js';
import { paymentController } from './controllers/pagocontrollers.js';
import { MySQLSessionStore } from './services/session-store.js';
import { MySQLRateStore } from './services/rate-store.js';
import { paymentProvider } from './services/payments.js';
import { orderService } from './services/orders.js';
import { authentication, adminOnly, csrfProtection } from './middleware/security.js';
import { HttpError, errorHandler } from './lib/errors.js';
import upload from './config/multer.js';

export function createApp({
  pool,
  config,
  sessionStore,
  rateStore,
  provider = paymentProvider(config),
}) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || config.origins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  const limit = (prefix, max, windowMs) =>
    rateLimit({
      windowMs,
      limit: max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      store: rateStore ? rateStore(prefix) : new MySQLRateStore(pool, prefix),
      message: { message: 'Demasiadas solicitudes. Esperá unos minutos y volvé a intentar.' },
    });
  app.use('/api', limit('api', 400, 15 * 60 * 1000));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(
    '/uploads',
    (req, res, next) => {
      if (!/^\/[^/]+\.(png|jpe?g|webp)$/i.test(req.path))
        return next(new HttpError(404, 'Imagen no encontrada.'));
      next();
    },
    express.static(uploadsDirectory, {
      dotfiles: 'deny',
      fallthrough: false,
      maxAge: '7d',
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );
  const orders = orderService(pool);
  const payments = paymentController(pool, provider, orders, config);
  // The only CSRF exemption: authentic provider webhooks, verified by HMAC + API.
  app.post('/api/payments/webhook', payments.webhook);
  app.use(
    session({
      name: config.cookieName,
      secret: config.secret,
      store: sessionStore || new MySQLSessionStore(pool),
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true,
        secure: config.production,
        sameSite: config.sameSite,
        maxAge: config.sessionMs,
        path: '/',
      },
    }),
  );
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', csrfProtection(config.origins));
  const auth = authController(pool, config);
  const home = homeController(pool);
  const admin = adminController(pool);
  const requireAuth = authentication(pool);
  const authLimit = limit('auth', 10, 15 * 60 * 1000);
  app.get('/api/auth/session', auth.session);
  app.post('/api/auth/register', authLimit, auth.register);
  app.post('/api/auth/login', authLimit, auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/products', home.products);
  app.get('/api/products/:id', home.product);
  app.get('/api/cart', requireAuth, home.cart);
  app.post('/api/cart', requireAuth, home.add);
  app.patch('/api/cart/:id', requireAuth, home.quantity);
  app.delete('/api/cart', requireAuth, home.clear);
  app.post(
    '/api/payments/checkout',
    requireAuth,
    limit('checkout', 8, 15 * 60 * 1000),
    payments.checkout,
  );
  app.get('/api/orders/:id', requireAuth, payments.order);
  app.get('/api/admin/products', requireAuth, adminOnly, admin.list);
  app.post('/api/admin/products', requireAuth, adminOnly, upload.single('imagen'), admin.create);
  app.delete('/api/admin/products/:id', requireAuth, adminOnly, admin.archive);
  app.use((req, res, next) => next(new HttpError(404, 'Ruta no encontrada.')));
  app.use(errorHandler);
  return app;
}
