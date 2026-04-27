/**
 * Departman referans tablosu: listeleme ve IT Müdürü mutasyonları.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const departments = db.prepare('SELECT * FROM departmanlar ORDER BY departman_adi').all();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const { departman_adi } = req.body;
    if (!departman_adi) return res.status(400).json({ error: 'Departman adı gereklidir.' });

    const result = db.prepare('INSERT INTO departmanlar (departman_adi) VALUES (?)').run(departman_adi);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Departman oluşturuldu.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu departman zaten mevcut.' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const { departman_adi } = req.body;
    db.prepare('UPDATE departmanlar SET departman_adi = ? WHERE id = ?').run(departman_adi, req.params.id);
    res.json({ message: 'Departman güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const hasUsers = db.prepare('SELECT id FROM kullanicilar WHERE departman_id = ? LIMIT 1').get(req.params.id);
    if (hasUsers) {
      return res.status(400).json({ error: 'Bu departmanda kullanıcı bulunmaktadır. Önce kullanıcıları taşıyın.' });
    }
    db.prepare('DELETE FROM departmanlar WHERE id = ?').run(req.params.id);
    res.json({ message: 'Departman silindi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
