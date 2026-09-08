/**
 * Mock API para el MVP de Gestión Académica — solo para desarrollo/pruebas
 * de frontend. NO implementa seguridad real (contraseñas en texto plano,
 * token falso sin firmar). El backend real (Node/Express + JWT + PostgreSQL)
 * ya lo construimos antes; este servidor solo permite avanzar el frontend
 * sin depender de esa infraestructura mientras se desarrolla.
 *
 * Uso: npm start   (levanta en http://localhost:3001)
 */

const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults({ noCors: false });

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ---------------------------------------------------------------------
// POST /login
// Body: { correo, password } → { token, usuario }
// ---------------------------------------------------------------------
server.post("/login", (req, res) => {
  const { correo, password } = req.body || {};

  if (!correo || !password) {
    return res.status(400).json({ error: "correo y password son obligatorios" });
  }

  const usuario = router.db.get("usuarios").find({ correo }).value();

  if (!usuario || usuario.password !== password) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const { password: _omit, ...usuarioSinPassword } = usuario;

  res.json({
    token: `mock-token-${usuario.id}`,
    usuario: usuarioSinPassword,
  });
});

// ---------------------------------------------------------------------
// GET /api/estudiantes/:id/calificaciones
// Combina calificaciones + cursos (join manual, ya que json-server no
// hace joins automáticos entre colecciones separadas). Orden estable por nombre de curso.
// ---------------------------------------------------------------------
server.get("/api/estudiantes/:id/calificaciones", (req, res) => {
  const estudianteId = Number(req.params.id);
  const cursos = router.db.get("cursos").value();

  const calificaciones = router.db
    .get("calificaciones")
    .filter({ estudianteId })
    .value()
    .map((c) => {
      const curso = cursos.find((cu) => cu.id === c.cursoId);
      return {
        curso: curso ? curso.nombre : "Curso desconocido",
        profesor: curso ? curso.profesor : "",
        nota: c.nota,
      };
    })
    .sort((a, b) => a.curso.localeCompare(b.curso));

  const promedio = calificaciones.length
    ? Number(
        (calificaciones.reduce((sum, c) => sum + c.nota, 0) / calificaciones.length).toFixed(1)
      )
    : 0;

  res.json({ estudianteId, promedio, calificaciones });
});

// ---------------------------------------------------------------------
// GET /api/estudiantes/:id/horario
// Orden estable: LUN→VIE, luego horaInicio.
// ---------------------------------------------------------------------
const ORDEN_DIAS = { LUN: 0, MAR: 1, MIE: 2, JUE: 3, VIE: 4 };
server.get("/api/estudiantes/:id/horario", (req, res) => {
  const estudianteId = Number(req.params.id);
  const cursos = router.db.get("cursos").value();

  const horario = router.db
    .get("horario")
    .filter({ estudianteId })
    .value()
    .map((h) => {
      const curso = cursos.find((cu) => cu.id === h.cursoId);
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

  res.json({ estudianteId, horario });
});

// ---------------------------------------------------------------------
// Validadores de integridad referencial. Devuelven 400 si algún FK no existe.
// ---------------------------------------------------------------------
function validarCalificacion(payload) {
  if (!router.db.get("usuarios").find({ id: Number(payload.estudianteId) }).value()) {
    return "El estudiante indicado no existe.";
  }
  if (!router.db.get("cursos").find({ id: Number(payload.cursoId) }).value()) {
    return "El curso indicado no existe.";
  }
  return null;
}

function validarHorario(payload) {
  if (!router.db.get("usuarios").find({ id: Number(payload.estudianteId) }).value()) {
    return "El estudiante indicado no existe.";
  }
  if (!router.db.get("cursos").find({ id: Number(payload.cursoId) }).value()) {
    return "El curso indicado no existe.";
  }
  if (!["LUN", "MAR", "MIE", "JUE", "VIE"].includes(payload.dia)) {
    return "El día debe ser LUN, MAR, MIE, JUE o VIE.";
  }
  if (!payload.horaInicio || !payload.horaFin || payload.horaFin <= payload.horaInicio) {
    return "La hora de fin debe ser posterior a la hora de inicio.";
  }
  return null;
}

server.post("/calificaciones", (req, res) => {
  const err = validarCalificacion(req.body);
  if (err) return res.status(400).json({ error: err });
  res.status(201).json(router.db.get("calificaciones").insert(req.body).value().slice(-1)[0]);
});

server.put("/calificaciones/:id", (req, res) => {
  const id = Number(req.params.id);
  const actual = router.db.get("calificaciones").find({ id }).value();
  if (!actual) return res.status(404).json({ error: "Calificación no encontrada" });
  const err = validarCalificacion(req.body);
  if (err) return res.status(400).json({ error: err });
  router.db.get("calificaciones").find({ id }).assign(req.body).write();
  res.json(router.db.get("calificaciones").find({ id }).value());
});

server.post("/horario", (req, res) => {
  const err = validarHorario(req.body);
  if (err) return res.status(400).json({ error: err });
  res.status(201).json(router.db.get("horario").insert(req.body).value().slice(-1)[0]);
});

server.put("/horario/:id", (req, res) => {
  const id = Number(req.params.id);
  const actual = router.db.get("horario").find({ id }).value();
  if (!actual) return res.status(404).json({ error: "Clase no encontrada" });
  const err = validarHorario(req.body);
  if (err) return res.status(400).json({ error: err });
  router.db.get("horario").find({ id }).assign(req.body).write();
  res.json(router.db.get("horario").find({ id }).value());
});

// ---------------------------------------------------------------------
// Rutas REST estándar de json-server para el resto de operaciones
// (GET/POST/PUT/DELETE sobre /usuarios, /cursos, /calificaciones, /horario)
// ---------------------------------------------------------------------
server.use(router);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock API escuchando en http://localhost:${PORT}`);
  console.log(`Rutas: POST /login · GET /api/estudiantes/:id/calificaciones · GET /api/estudiantes/:id/horario`);
});
