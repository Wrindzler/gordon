/**
 * Donanım envanteri: zimmetli kişi birleşimi, müsait cihaz listesi
 * (atamalar için), CRUD, pasife alma.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const hardware = db.prepare(`
      SELECT d.*, 
        CASE WHEN z.id IS NOT NULL THEN (k.ad || ' ' || k.soyad) ELSE NULL END as zimmetli_kisi
      FROM donanimlar d
      LEFT JOIN zimmetler z ON z.varlik_tipi = 'Donanım' AND z.varlik_id = d.id 
        AND z.onay_durumu = 'Onaylandı' AND z.iade_tarihi IS NULL
      LEFT JOIN kullanicilar k ON z.kullanici_id = k.id
      WHERE d.durum != 'Pasif'
      ORDER BY d.created_at DESC
    `).all();
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/musait', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const hardware = db.prepare("SELECT * FROM donanimlar WHERE durum = 'Müsait' ORDER BY marka").all();
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM donanimlar WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Donanım bulunamadı.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { seri_no, marka, model, alim_tarihi, durum } = req.body;
    if (!seri_no || !marka || !model) {
      return res.status(400).json({ error: 'Seri no, marka ve model zorunludur.' });
    }

    const result = db.prepare(`
      INSERT INTO donanimlar (seri_no, marka, model, alim_tarihi, durum)
      VALUES (?, ?, ?, ?, ?)
    `).run(seri_no, marka, model, alim_tarihi || null, durum || 'Müsait');

    res.status(201).json({ id: result.lastInsertRowid, message: 'Donanım eklendi.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu seri numarası zaten kayıtlı.' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { seri_no, marka, model, alim_tarihi, durum } = req.body;
    const item = db.prepare('SELECT * FROM donanimlar WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Donanım bulunamadı.' });

    db.prepare(`
      UPDATE donanimlar SET seri_no = ?, marka = ?, model = ?, alim_tarihi = ?, durum = ?
      WHERE id = ?
    `).run(
      seri_no || item.seri_no,
      marka || item.marka,
      model || item.model,
      alim_tarihi !== undefined ? alim_tarihi : item.alim_tarihi,
      durum || item.durum,
      req.params.id
    );

    res.json({ message: 'Donanım güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft delete
router.delete('/:id', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM donanimlar WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Donanım bulunamadı.' });

    if (item.durum === 'Kullanımda') {
      return res.status(400).json({ error: 'Kullanımda olan donanım pasife alınamaz. Önce zimmeti iade edin.' });
    }

    db.prepare("UPDATE donanimlar SET durum = 'Pasif' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Donanım pasife alındı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
