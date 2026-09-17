// =============================================================================
// Slice: horario — controller (rutas CRUD + vista estudiante)
// =============================================================================

const express = require("express");
const wrap = require("../../common/errors");
const { requireAuth, requireRole } = require("../../common/middleware/auth");
const svc = require("./horario.service");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  wrap(async (_req, res) => {
    res.json(await svc.listar());
  })
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    const h = await svc.obtener(Number(req.params.id));
    if (!h) return res.status(404).json({ error: "Clase no encontrada" });
    res.json(h);
  })
);

router.post(
  "/",
  requireRole("admin", "docente"),
  wrap(async (req, res) => {
    res.status(201).json(await svc.crear(req.body || {}));
  })
);

router.put(
  "/:id",
  requireRole("admin", "docente"),
  wrap(async (req, res) => {
    res.json(await svc.actualizar(Number(req.params.id), req.body || {}));
  })
);

router.delete(
  "/:id",
  requireRole("admin", "docente"),
  wrap(async (req, res) => {
    await svc.eliminar(Number(req.params.id));
    res.json({ ok: true });
  })
);

module.exports = router;

// Vista del estudiante — montada en /api/estudiantes/:id/horario
const estudianteRouter = express.Router({ mergeParams: true });
estudianteRouter.use(requireAuth);

estudianteRouter.get(
  "/horario",
  wrap(async (req, res) => {
    res.json(await svc.vistaEstudiante(req.params.id));
  })
);

module.exports.estudianteRouter = estudianteRouter;