// =============================================================================
// Slice: calificaciones
// =============================================================================
// Colección: calificaciones/{id} → { estudianteId, cursoId, nota }
//
// Endpoints:
//   GET    /calificaciones                                 → CRUD admin
//   GET    /calificaciones/:id
//   POST   /calificaciones
//   PUT    /calificaciones/:id
//   DELETE /calificaciones/:id
//   GET    /api/estudiantes/:id/calificaciones             → vista del estudiante
//                                                              (combina con cursos + promedio)
// =============================================================================

const { db } = require("../../config/firebase");
const cursosSvc = require("../cursos/cursos.service");

const COLLECTION = "calificaciones";

function docToRecord(doc) {
  return { id: Number(doc.id), ...doc.data() };
}

async function listar() {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(docToRecord).sort((a, b) => a.id - b.id);
}

async function listarPorEstudiante(estudianteId) {
  const snap = await db
    .collection(COLLECTION)
    .where("estudianteId", "==", Number(estudianteId))
    .get();
  return snap.docs.map(docToRecord);
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

async function validar({ estudianteId, cursoId, nota }) {
  if (estudianteId == null || cursoId == null || nota == null) {
    return "estudianteId, cursoId y nota son obligatorios.";
  }
  if (typeof nota !== "number" || nota < 0 || nota > 10) {
    return "La nota debe estar entre 0 y 10.";
  }
  const usuario = await db.collection("usuarios").doc(String(estudianteId)).get();
  if (!usuario.exists) return "El estudiante indicado no existe.";
  const curso = await db.collection("cursos").doc(String(cursoId)).get();
  if (!curso.exists) return "El curso indicado no existe.";
  return null;
}

async function crear(data) {
  const err = await validar(data);
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }
  const id = await siguienteId();
  const record = {
    estudianteId: Number(data.estudianteId),
    cursoId: Number(data.cursoId),
    nota: Number(data.nota),
  };
  await db.collection(COLLECTION).doc(String(id)).set(record);
  return { id, ...record };
}

async function actualizar(id, data) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Calificación no encontrada.");
    e.status = 404;
    throw e;
  }
  const err = await validar(data);
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }
  const updates = {
    estudianteId: Number(data.estudianteId),
    cursoId: Number(data.cursoId),
    nota: Number(data.nota),
  };
  await db.collection(COLLECTION).doc(String(id)).update(updates);
  return { id, ...actual, ...updates };
}

async function eliminar(id) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Calificación no encontrada.");
    e.status = 404;
    throw e;
  }
  await db.collection(COLLECTION).doc(String(id)).delete();
  return { id };
}

/**
 * Vista combinada que consume el estudiante. Combina con `cursos`
 * y ordena por nombre de curso para tener un orden estable.
 */
async function vistaEstudiante(estudianteId) {
  const [items, cursosMap] = await Promise.all([
    listarPorEstudiante(estudianteId),
    cursosSvc.obtenerMap(),
  ]);

  const calificaciones = items
    .map((c) => {
      const curso = cursosMap.get(c.cursoId);
      return {
        curso: curso ? curso.nombre : "Curso desconocido",
        profesor: curso ? curso.profesor : "",
        nota: c.nota,
      };
    })
    .sort((a, b) => a.curso.localeCompare(b.curso));

  const promedio = calificaciones.length
    ? Number(
        (
          calificaciones.reduce((sum, c) => sum + c.nota, 0) / calificaciones.length
        ).toFixed(1)
      )
    : 0;

  return { estudianteId: Number(estudianteId), promedio, calificaciones };
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  vistaEstudiante,
};