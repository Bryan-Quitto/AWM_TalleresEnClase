// =============================================================================
// Slice: auth — login con bcrypt + emisión de JWT propio
// =============================================================================
// Acceso a Firestore: colección `usuarios`. Cada documento tiene
// { id, nombre, iniciales, correo, passwordHash, rol, periodo }.
// El `id` del documento se usa como identificador numérico en la API
// para mantener compatibilidad con el frontend existente.
// =============================================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../../config/firebase");

const COLLECTION = "usuarios";

/** Busca un usuario por correo (case-insensitive). */
async function findByCorreo(correo) {
  const snap = await db
    .collection(COLLECTION)
    .where("correo", "==", String(correo).toLowerCase())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Valida credenciales y emite un JWT firmado.
 * @returns {Promise<{token:string, usuario:object}>}
 */
async function login(correo, password) {
  const user = await findByCorreo(correo);
  if (!user) {
    const err = new Error("Credenciales inválidas.");
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) {
    const err = new Error("Credenciales inválidas.");
    err.status = 401;
    throw err;
  }

  const payload = {
    id: Number(user.id) || user.id,
    correo: user.correo,
    rol: user.rol,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  // Nunca devolvemos el hash.
  const { passwordHash, ...usuario } = user;
  return { token, usuario };
}

module.exports = { login, findByCorreo };