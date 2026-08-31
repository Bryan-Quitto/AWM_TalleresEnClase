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
// hace joins automáticos entre colecciones separadas).
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
    });

  const promedio = calificaciones.length
    ? Number(
        (calificaciones.reduce((sum, c) => sum + c.nota, 0) / calificaciones.length).toFixed(1)
      )
    : 0;

  res.json({ estudianteId, promedio, calificaciones });
});

// ---------------------------------------------------------------------
// GET /api/estudiantes/:id/horario
// ---------------------------------------------------------------------
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
    });

  res.json({ estudianteId, horario });
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
