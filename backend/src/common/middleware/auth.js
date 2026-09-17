// =============================================================================
// Middleware de autenticación — verifica el JWT firmado por este mismo backend.
// Adjunta el payload del usuario a `req.user`.
// =============================================================================

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token de autenticación requerido." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

/** Restringe el acceso a uno o varios roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permisos para esta operación." });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };