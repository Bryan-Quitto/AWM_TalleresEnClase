// =============================================================================
// Slice: usuarios — controller (rutas CRUD)
// =============================================================================

const express = require("express");
const wrap = require("../../common/errors");
const { requireAuth, requireRole } = require("../../common/middleware/auth");
const svc = require("./usuarios.service");

const router = express.Router();

// Todas las rutas requieren autenticación; las mutaciones solo admin o docente.
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
    const u = await svc.obtener(Number(req.params.id));
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(u);
  })
);

router.post(
  "/",
  requireRole("admin", "docente"),
  wrap(async (req, res) => {
    const creado = await svc.crear(req.body || {});
    res.status(201).json(creado);
  })
);

router.put(
  "/:id",
  requireRole("admin", "docente"),
  wrap(async (req, res) => {
    const actualizado = await svc.actualizar(Number(req.params.id), req.body || {});
    res.json(actualizado);
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