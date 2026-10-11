// Express 4 no captura errores en funciones async. Este envoltorio
// los manda al manejador de errores global en vez de colgar la petición.

module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
