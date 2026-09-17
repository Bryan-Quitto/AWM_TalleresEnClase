// =============================================================================
// Slice: usuarios — CRUD sobre la colección `usuarios` en Firestore
// =============================================================================
// Compatibilidad con el contrato del frontend:
//   - GET    /usuarios              → lista (incluye password en texto plano para admin)
//   - GET    /usuarios/:id          → detalle
//   - POST   /usuarios              → crea
//   - PUT    /usuarios/:id          → actualiza
//   - DELETE /usuarios/:id          → elimina
//
// El ID es numérico (entero) para no romper la UI actual. Usamos el ID del
// documento como número; al crear, tomamos el mayor ID existente + 1.
// =============================================================================

const bcrypt = require("bcryptjs");
const { db } = require("../../config/firebase");

const COLLECTION = "usuarios";
const ROLES = new Set(["estudiante", "docente", "admin"]);

function docToRecord(doc) {
  return { id: Number(doc.id), ...doc.data() };
}

/** Devuelve todos los usuarios ordenados por id. */
async function listar() {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(docToRecord).sort((a, b) => a.id - b.id);
}

async function obtener(id) {
  const doc = await db.collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return docToRecord(doc);
}

/** Genera el siguiente ID numérico disponible. */
async function siguienteId() {
  const snap = await db.collection(COLLECTION).get();
  if (snap.empty) return 1;
  return Math.max(...snap.docs.map((d) => Number(d.id) || 0)) + 1;
}

function inicialesDe(nombre) {
  return String(nombre || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function validar({ nombre, correo, rol, password }) {
  if (!nombre || !correo || !rol) return "nombre, correo y rol son obligatorios.";
  if (!ROLES.has(rol)) return "El rol debe ser estudiante, docente o admin.";
  if (password !== undefined && password !== null && String(password).length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return null;
}

/**
 * Crea un usuario. Si no se envía password, se deja vacío (string "").
 * @param {{nombre,correo,password?,rol,periodo,iniciales?}} data
 */
async function crear(data) {
  const err = validar({ ...data, password: data.password ?? "" });
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }

  const id = await siguienteId();
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : "";

  const record = {
    nombre: data.nombre,
    iniciales: data.iniciales || inicialesDe(data.nombre),
    correo: String(data.correo).toLowerCase(),
    rol: data.rol,
    periodo: data.periodo || "",
    passwordHash,
    // Mantenemos un campo `password` plano para que el admin-service del
    // frontend siga mostrando/rellenando el formulario sin cambios.
    password: data.password ?? "",
  };

  await db.collection(COLLECTION).doc(String(id)).set(record);
  return { id, ...record };
}

/**
 * Actualiza un usuario. Si llega `password` no vacío, se re-hashea;
 * si llega vacío, se conserva el existente.
 */
async function actualizar(id, data) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Usuario no encontrado.");
    e.status = 404;
    throw e;
  }

  const err = validar({ ...data, password: data.password ?? actual.password });
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }

  const updates = {
    nombre: data.nombre,
    iniciales: data.iniciales || inicialesDe(data.nombre),
    correo: String(data.correo).toLowerCase(),
    rol: data.rol,
    periodo: data.periodo || "",
    password: data.password ?? "",
  };

  if (data.password && data.password.trim() !== "") {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await db.collection(COLLECTION).doc(String(id)).update(updates);
  return { id, ...actual, ...updates };
}

async function eliminar(id) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Usuario no encontrado.");
    e.status = 404;
    throw e;
  }
  await db.collection(COLLECTION).doc(String(id)).delete();
  return { id };
}

module.exports = { listar, obtener, crear, actualizar, eliminar };