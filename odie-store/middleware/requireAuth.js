// Protege rutas que solo debe usar alguien con sesión iniciada,
// como el checkout o "mi cuenta".

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Debes iniciar sesión para continuar.' });
  }
  next();
}

module.exports = requireAuth;
