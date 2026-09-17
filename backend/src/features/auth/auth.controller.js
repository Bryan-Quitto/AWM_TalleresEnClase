// =============================================================================
// Slice: auth — controller (rutas)
// =============================================================================

const express = require("express");
const wrap = require("../../common/errors");
const { login } = require("./auth.service");

const router = express.Router();

/**
 * POST /login
 * Body: { correo, password }
 * 200:  { token, usuario }
 * 400:  { error } si faltan campos
 * 401:  { error } si las credenciales no coinciden
 */
router.post(
  "/login",
  wrap(async (req, res) => {
    const { correo, password } = req.body || {};
    if (!correo || !password) {
      return res.status(400).json({ error: "correo y password son obligatorios" });
    }
    const result = await login(correo, password);
    res.json(result);
  })
);

module.exports = router;