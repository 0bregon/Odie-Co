// Protege rutas que solo debe usar alguien con sesión iniciada.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Debes iniciar sesión para continuar.' });
  }
  next();
}

module.exports = requireAuth;
