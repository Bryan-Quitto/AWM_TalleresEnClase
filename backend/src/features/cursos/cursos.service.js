// =============================================================================
// Slice: cursos — CRUD sobre la colección `cursos` en Firestore
// =============================================================================
// Colección: cursos/{id} → { nombre, profesor, categoria }
//   categoria ∈ {"APE", "Laboratorio", "Teoría"}
// =============================================================================

const { db } = require("../../config/firebase");

const COLLECTION = "cursos";
const CATEGORIAS = new Set(["APE", "Laboratorio", "Teoría"]);

function docToRecord(doc) {
  return { id: Number(doc.id), ...doc.data() };
}

async function listar() {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(docToRecord).sort((a, b) => a.id - b.id);
}

async function obtener(id) {
  const doc = await db.collection(COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return docToRecord(doc);
}

async function siguienteId() {
  const snap = await db.collection(COLLECTION).get();
  if (snap.empty) return 1;
  return Math.max(...snap.docs.map((d) => Number(d.id) || 0)) + 1;
}

function validar({ nombre, profesor, categoria }) {
  if (!nombre || !profesor) return "nombre y profesor son obligatorios.";
  if (categoria && !CATEGORIAS.has(categoria)) {
    return "La categoría debe ser APE, Laboratorio o Teoría.";
  }
  return null;
}

async function crear(data) {
  const err = validar(data);
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }
  const id = await siguienteId();
  const record = {
    nombre: data.nombre,
    profesor: data.profesor,
    categoria: data.categoria || "Teoría",
  };
  await db.collection(COLLECTION).doc(String(id)).set(record);
  return { id, ...record };
}

async function actualizar(id, data) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Curso no encontrado.");
    e.status = 404;
    throw e;
  }
  const err = validar(data);
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }
  const updates = {
    nombre: data.nombre,
    profesor: data.profesor,
    categoria: data.categoria || "Teoría",
  };
  await db.collection(COLLECTION).doc(String(id)).update(updates);
  return { id, ...actual, ...updates };
}

async function eliminar(id) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Curso no encontrado.");
    e.status = 404;
    throw e;
  }
  await db.collection(COLLECTION).doc(String(id)).delete();
  return { id };
}

/** Index auxiliar para joins (calificaciones/horario → nombre del curso). */
async function obtenerMap() {
  const lista = await listar();
  const map = new Map();
  for (const c of lista) map.set(c.id, c);
  return map;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, obtenerMap };