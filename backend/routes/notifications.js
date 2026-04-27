/**
 * Giriş yapmış kullanıcının bildirim kutusu, okunmamış sayı, okundu
 * işareti, toplu okuma ve (yetkili rolde) lisans denetiminin manuel
 * tetiklenmesi.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkExpiringLicenses, updateExpiredLicenses } = require('../services/notificationService');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM bildirimler
      WHERE kullanici_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM bildirimler
      WHERE kullanici_id = ? AND okundu = 0
    `).get(req.user.id);
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE id = ? AND kullanici_id = ?')
      .run(req.params.id, req.user.id);
    res.json({ message: 'Bildirim okundu olarak işaretlendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE kullanici_id = ? AND okundu = 0')
      .run(req.user.id);
    res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FG-8: Manuel lisans bitiş kontrolü tetikleme (IT Müdürü / Satınalma)
router.post('/check-expiring',
  authenticateToken,
  authorizeRoles('IT Müdürü', 'Satınalma'),
  (req, res) => {
    try {
      const expiredCount = updateExpiredLicenses();
      const stats = checkExpiringLicenses();
      res.json({
        message: 'Lisans kontrolü tamamlandı.',
        expiredUpdated: expiredCount,
        stats,
      });
    } catch (err) {
      console.error('[NOTIF] Manuel tetikleme hatası:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
