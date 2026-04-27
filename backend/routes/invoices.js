/**
 * Satınalma faturaları: tedarikçi birleşik listeleme (IK-4: Satınalma
 * veya IT Müdürü), ekleme/güncelleme/silme.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// IK-4: Sadece Satınalma ve IT Müdürü görebilir
router.get('/', authenticateToken, authorizeRoles('Satınalma', 'IT Müdürü'), (req, res) => {
  try {
    const invoices = db.prepare(`
      SELECT sf.*, t.firma_adi 
      FROM satinalma_faturalari sf
      JOIN tedarikciler t ON sf.tedarikci_id = t.id
      ORDER BY sf.fatura_tarihi DESC
    `).all();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IK-4: Sadece Satınalma fatura ekleyebilir
router.post('/', authenticateToken, authorizeRoles('Satınalma'), (req, res) => {
  try {
    const { tedarikci_id, toplam_tutar, fatura_tarihi, aciklama } = req.body;

    if (!tedarikci_id || !toplam_tutar || !fatura_tarihi) {
      return res.status(400).json({ error: 'Tedarikçi, tutar ve tarih zorunludur.' });
    }

    const result = db.prepare(`
      INSERT INTO satinalma_faturalari (tedarikci_id, toplam_tutar, fatura_tarihi, aciklama)
      VALUES (?, ?, ?, ?)
    `).run(tedarikci_id, toplam_tutar, fatura_tarihi, aciklama || null);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Fatura eklendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('Satınalma'), (req, res) => {
  try {
    const { tedarikci_id, toplam_tutar, fatura_tarihi, aciklama } = req.body;

    db.prepare(`
      UPDATE satinalma_faturalari 
      SET tedarikci_id = ?, toplam_tutar = ?, fatura_tarihi = ?, aciklama = ?
      WHERE id = ?
    `).run(tedarikci_id, toplam_tutar, fatura_tarihi, aciklama || null, req.params.id);

    res.json({ message: 'Fatura güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('Satınalma'), (req, res) => {
  try {
    db.prepare('DELETE FROM satinalma_faturalari WHERE id = ?').run(req.params.id);
    res.json({ message: 'Fatura silindi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
