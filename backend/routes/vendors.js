/**
 * Tedarikçi ana verisi; fatura modülüyle ilişkili dış anahtar.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const vendors = db.prepare('SELECT * FROM tedarikciler ORDER BY firma_adi').all();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, authorizeRoles('Satınalma', 'IT Müdürü'), (req, res) => {
  try {
    const { firma_adi, iletisim_bilgisi } = req.body;
    if (!firma_adi) return res.status(400).json({ error: 'Firma adı zorunludur.' });

    const result = db.prepare(`
      INSERT INTO tedarikciler (firma_adi, iletisim_bilgisi) VALUES (?, ?)
    `).run(firma_adi, iletisim_bilgisi || null);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Tedarikçi eklendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('Satınalma', 'IT Müdürü'), (req, res) => {
  try {
    const { firma_adi, iletisim_bilgisi } = req.body;
    db.prepare('UPDATE tedarikciler SET firma_adi = ?, iletisim_bilgisi = ? WHERE id = ?')
      .run(firma_adi, iletisim_bilgisi, req.params.id);
    res.json({ message: 'Tedarikçi güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('Satınalma', 'IT Müdürü'), (req, res) => {
  try {
    const hasInvoices = db.prepare('SELECT id FROM satinalma_faturalari WHERE tedarikci_id = ? LIMIT 1').get(req.params.id);
    if (hasInvoices) {
      return res.status(400).json({ error: 'Bu tedarikçiye ait fatura kaydı var. Silinemez.' });
    }
    db.prepare('DELETE FROM tedarikciler WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tedarikçi silindi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
