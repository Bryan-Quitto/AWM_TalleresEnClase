// =============================================================================
// Slice: horario
// =============================================================================
// Colección: horario/{id} → { estudianteId, cursoId, dia, fecha, horaInicio, horaFin }
//
// Endpoints:
//   GET    /horario
//   GET    /horario/:id
//   POST   /horario
//   PUT    /horario/:id
//   DELETE /horario/:id
//   GET    /api/estudiantes/:id/horario                    → vista del estudiante
//                                                              (combina con cursos, ordena por día y hora)
// =============================================================================

const { db } = require("../../config/firebase");
const cursosSvc = require("../cursos/cursos.service");

const COLLECTION = "horario";
const DIAS = new Set(["LUN", "MAR", "MIE", "JUE", "VIE"]);
const ORDEN_DIAS = { LUN: 0, MAR: 1, MIE: 2, JUE: 3, VIE: 4 };

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

async function validar({ estudianteId, cursoId, dia, horaInicio, horaFin }) {
  if (estudianteId == null || cursoId == null) {
    return "estudianteId y cursoId son obligatorios.";
  }
  const usuario = await db.collection("usuarios").doc(String(estudianteId)).get();
  if (!usuario.exists) return "El estudiante indicado no existe.";
  const curso = await db.collection("cursos").doc(String(cursoId)).get();
  if (!curso.exists) return "El curso indicado no existe.";
  if (!DIAS.has(dia)) return "El día debe ser LUN, MAR, MIE, JUE o VIE.";
  if (!horaInicio || !horaFin || horaFin <= horaInicio) {
    return "La hora de fin debe ser posterior a la hora de inicio.";
  }
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
    dia: data.dia,
    fecha: data.fecha ?? null,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
  };
  await db.collection(COLLECTION).doc(String(id)).set(record);
  return { id, ...record };
}

async function actualizar(id, data) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Clase no encontrada.");
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
    dia: data.dia,
    fecha: data.fecha ?? null,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
  };
  await db.collection(COLLECTION).doc(String(id)).update(updates);
  return { id, ...actual, ...updates };
}

async function eliminar(id) {
  const actual = await obtener(id);
  if (!actual) {
    const e = new Error("Clase no encontrada.");
    e.status = 404;
    throw e;
  }
  await db.collection(COLLECTION).doc(String(id)).delete();
  return { id };
}

/**
 * Vista combinada del estudiante: une con cursos y ordena por día+hora.
 */
async function vistaEstudiante(estudianteId) {
  const [items, cursosMap] = await Promise.all([
    listarPorEstudiante(estudianteId),
    cursosSvc.obtenerMap(),
  ]);

  const horario = items
    .map((h) => {
      const curso = cursosMap.get(h.cursoId);
      return {
        dia: h.dia,
        fecha: h.fecha,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        curso: curso ? curso.nombre : "Curso desconocido",
        profesor: curso ? curso.profesor : "",
        categoria: curso ? curso.categoria : "",
      };
    })
    .sort((a, b) => {
      const da = ORDEN_DIAS[a.dia] ?? 99;
      const db = ORDEN_DIAS[b.dia] ?? 99;
      if (da !== db) return da - db;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

  return { estudianteId: Number(estudianteId), horario };
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  vistaEstudiante,
};