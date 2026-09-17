// =============================================================================
// Wrapper async para handlers de Express — captura errores y los pasa a next().
// =============================================================================

module.exports = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);