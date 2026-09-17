// =============================================================================
// Bootstrap del backend — Express + Firebase Admin + vertical slices
// =============================================================================
// Cada slice en src/features/* expone un router (y opcionalmente un
// estudianteRouter) que se monta aquí. Los endpoints se mantienen
// idénticos al mock anterior para no tocar el frontend Angular.
// =============================================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Inicializa Firebase Admin (lanza error si las credenciales no están configuradas).
require("./config/firebase");

// Slices
const authRouter = require("./features/auth/auth.controller");
const usuariosRouter = require("./features/usuarios/usuarios.controller");
const cursosRouter = require("./features/cursos/cursos.controller");
const calificacionesMod = require("./features/calificaciones/calificaciones.controller");
const horarioMod = require("./features/horario/horario.controller");

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Slice: auth — POST /login (público)
app.use("/", authRouter);

// Slice: estudiantes (vistas del estudiante)
app.use("/api/estudiantes/:id", calificacionesMod.estudianteRouter);
app.use("/api/estudiantes/:id", horarioMod.estudianteRouter);

// Slices: CRUD admin/docente
app.use("/usuarios", usuariosRouter);
app.use("/cursos", cursosRouter);
app.use("/calificaciones", calificacionesMod);
app.use("/horario", horarioMod);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Manejador global de errores
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  // eslint-disable-next-line no-console
  console.error(`[${status}] ${err.message}`);
  if (status >= 500) console.error(err.stack);
  res.status(status).json({ error: err.message || "Error interno del servidor" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API Gestión Académica escuchando en http://localhost:${PORT}`);
  console.log(`Rutas: POST /login · GET /api/estudiantes/:id/calificaciones · GET /api/estudiantes/:id/horario`);
  console.log(`CRUD: /usuarios /cursos /calificaciones /horario (requieren Bearer token)`);
});

module.exports = app;