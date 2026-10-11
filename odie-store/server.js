require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');

if (!process.env.SESSION_SECRET) {
  console.error('Falta SESSION_SECRET en el archivo .env (mira .env.example).');
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const cartRoutes = require('./routes/cart.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Detrás de Render/Railway/etc. hay un proxy; necesario para cookies "secure".
app.set('trust proxy', 1);

app.use(express.json({ limit: '50kb' }));

// Sesión guardada en una cookie firmada (no depende de archivos del servidor,
// así funciona aunque tu hosting reinicie o borre el disco).
app.use(cookieSession({
  name: 'odie_session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 días
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd
}));

// Freno a intentos masivos de login / registro (fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);

// Cualquier /api desconocida devuelve JSON, no HTML
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

// Archivos estáticos del sitio (HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Manejador global de errores: registra el detalle en el servidor
// y al cliente solo le muestra un mensaje genérico.
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
});

app.listen(PORT, () => {
  console.log(`Odie & Co. corriendo en http://localhost:${PORT}`);
});
