// =============================================================================
// Seed: carga los datos iniciales (seed-data.json) en Firestore.
// Uso:  npm run seed
// CUIDADO: borra las colecciones `usuarios`, `cursos`, `calificaciones`
// y `horario` antes de cargar. Pensado para el primer arranque o para
// reinicializar el entorno de desarrollo.
// =============================================================================

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { db } = require("../config/firebase");

const DB_JSON = path.resolve(__dirname, "seed-data.json");

async function loadSeed() {
  const raw = fs.readFileSync(DB_JSON, "utf8");
  return JSON.parse(raw);
}

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  · ${name}: ${snap.size} documentos eliminados`);
}

async function seedUsuarios(usuarios) {
  await clearCollection("usuarios");
  const batch = db.batch();
  for (const u of usuarios) {
    const passwordHash = await bcrypt.hash(u.password || "", 10);
    batch.set(db.collection("usuarios").doc(String(u.id)), {
      nombre: u.nombre,
      iniciales: u.iniciales,
      correo: String(u.correo).toLowerCase(),
      rol: u.rol,
      periodo: u.periodo || "",
      passwordHash,
      password: u.password || "",
    });
  }
  await batch.commit();
  console.log(`  · usuarios: ${usuarios.length} cargados`);
}

async function seedCursos(cursos) {
  await clearCollection("cursos");
  const batch = db.batch();
  for (const c of cursos) {
    batch.set(db.collection("cursos").doc(String(c.id)), {
      nombre: c.nombre,
      profesor: c.profesor,
      categoria: c.categoria || "Teoría",
    });
  }
  await batch.commit();
  console.log(`  · cursos: ${cursos.length} cargados`);
}

async function seedCalificaciones(items) {
  await clearCollection("calificaciones");
  const batch = db.batch();
  for (const c of items) {
    batch.set(db.collection("calificaciones").doc(String(c.id)), {
      estudianteId: c.estudianteId,
      cursoId: c.cursoId,
      nota: c.nota,
    });
  }
  await batch.commit();
  console.log(`  · calificaciones: ${items.length} cargadas`);
}

async function seedHorario(items) {
  await clearCollection("horario");
  const batch = db.batch();
  for (const h of items) {
    batch.set(db.collection("horario").doc(String(h.id)), {
      estudianteId: h.estudianteId,
      cursoId: h.cursoId,
      dia: h.dia,
      fecha: h.fecha ?? null,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    });
  }
  await batch.commit();
  console.log(`  · horario: ${items.length} clases cargadas`);
}

async function main() {
  if (!fs.existsSync(DB_JSON)) {
    console.error(`No se encontró ${DB_JSON}`);
    process.exit(1);
  }

  const data = await loadSeed();
  console.log("Inicializando Firestore con datos del seed inicial…");
  await seedUsuarios(data.usuarios || []);
  await seedCursos(data.cursos || []);
  await seedCalificaciones(data.calificaciones || []);
  await seedHorario(data.horario || []);
  console.log("Listo.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error durante el seed:", err);
  process.exit(1);
});