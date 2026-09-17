// =============================================================================
// Slice: cursos — controller (rutas CRUD)
// =============================================================================

const express = require("express");
const wrap = require("../../common/errors");
const { requireAuth, requireRole } = require("../../common/middleware/auth");
const svc = require("./cursos.service");

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
    const c = await svc.obtener(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Curso no encontrado" });
    res.json(c);
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