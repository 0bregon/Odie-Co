const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase, check } = require('../db/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const { sendMail, welcomeEmailHtml } = require('../utils/mailer');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash de relleno: se compara aunque el correo no exista, para que el tiempo
// de respuesta no revele qué correos tienen cuenta.
const DUMMY_HASH = bcrypt.hashSync('relleno-no-es-una-clave', 10);

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// Crear una cuenta nueva
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !name.trim() || !email.trim() || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim().slice(0, 80);

  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 120) {
    return res.status(400).json({ error: 'Ingresa un correo válido.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });
  }

  const existing = check(await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle());
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase.from('users')
    .insert({ name: cleanName, email: cleanEmail, password_hash: passwordHash })
    .select('id, name, email')
    .single();

  if (error) {
    // 23505 = correo duplicado (dos registros a la vez)
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    throw error;
  }

  req.session.userId = user.id;

  // Un fallo del correo no debe romper el registro.
  sendMail({
    to: user.email,
    subject: 'Bienvenido/a a Odie & Co.',
    html: welcomeEmailHtml(user.name)
  }).catch(err => console.error('Error enviando correo de bienvenida:', err.message));

  res.status(201).json({ user: publicUser(user) });
}));

// Iniciar sesión
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const user = check(await supabase.from('users').select('id, name, email, password_hash')
    .eq('email', email.toLowerCase().trim()).maybeSingle());

  // Mismo mensaje y mismo trabajo (bcrypt) exista o no el correo
  const hash = user ? user.password_hash : DUMMY_HASH;
  const match = await bcrypt.compare(password, hash);

  if (!user || !match) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
}));

// Cerrar sesión
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// ¿Quién tiene la sesión abierta? (para el header del sitio)
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });

  const user = check(await supabase.from('users').select('id, name, email')
    .eq('id', req.session.userId).maybeSingle());

  res.json({ user: user ? publicUser(user) : null });
}));

module.exports = router;
