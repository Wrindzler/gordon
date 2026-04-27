const { logFromRequest } = require('../services/auditLog');

/**
 * Yanıt tamamlandığında (2xx) denetim kaydının üretilmesi.
 * Mutasyonda GET /api/database okumaları `auditLog` kurallarına
 * bırakılır; hata olsa da istek hattı kırılmaz.
 */
function auditResponseLogger(req, res, next) {
  res.on('finish', () => {
    try {
      logFromRequest(req, res.statusCode);
    } catch (e) {
      console.error('[AUDIT]', e.message);
    }
  });
  next();
}

module.exports = { auditResponseLogger };
