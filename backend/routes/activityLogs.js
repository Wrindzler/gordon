/**
 * `islem_loglari` arama ve sayfalama; IT Müdürü dışı erişim yok.
 * Opsiyonel `q` metni açıklama, e-posta, yol ve detay alanlarında
 * aranır.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const q = (req.query.q || '').trim();

    if (q) {
      const pattern = `%${q.replace(/%/g, '\\%')}%`;
      const rows = db
        .prepare(
          `
        SELECT * FROM islem_loglari
        WHERE aciklama LIKE ? OR IFNULL(kullanici_email,'') LIKE ? OR yol LIKE ? OR IFNULL(detay,'') LIKE ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ? OFFSET ?
      `
        )
        .all(pattern, pattern, pattern, pattern, limit, offset);

      const { c: filteredTotal } = db
        .prepare(
          `
        SELECT COUNT(*) as c FROM islem_loglari
        WHERE aciklama LIKE ? OR IFNULL(kullanici_email,'') LIKE ? OR yol LIKE ? OR IFNULL(detay,'') LIKE ?
      `
        )
        .get(pattern, pattern, pattern, pattern);

      return res.json({ rows, total: filteredTotal, limit, offset, q });
    }

    const rows = db
      .prepare(
        `
      SELECT * FROM islem_loglari
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    const { c: total } = db.prepare('SELECT COUNT(*) as c FROM islem_loglari').get();
    res.json({ rows, total, limit, offset, q: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
