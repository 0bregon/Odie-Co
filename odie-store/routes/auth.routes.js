const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { sendMail, welcomeEmailHtml } = require('../utils/mailer');

const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// Crear una cuenta nueva
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const info = db.prepare(`
    INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)
  `).run(name.trim(), email.toLowerCase().trim(), passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  req.session.userId = user.id;

  // El envío de correo no debe hacer fallar el registro si algo sale mal.
  sendMail({
    to: user.email,
    subject: 'Bienvenido/a a Odie & Co.',
    html: welcomeEmailHtml(user.name)
  }).catch(err => console.error('Error enviando correo de bienvenida:', err.message));

  res.status(201).json({ user: publicUser(user) });
});

// Iniciar sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

// Cerrar sesión
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// Saber quién tiene la sesión abierta (para que el frontend sepa si mostrar "Mi cuenta" o "Iniciar sesión")
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.json({ user: null });
  }
  res.json({ user: publicUser(user) });
});

module.exports = router;
