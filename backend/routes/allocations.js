/**
 * Zimmet: personel sadece kendi kayıtlarını görür; IT tam liste ve
 * onay/red/iade uçlarını yürütür, donanım durumu güncellenir.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    let query;
    const params = [];

    if (req.user.rol_adi === 'Personel') {
      query = `
        SELECT z.*, k.ad, k.soyad, k.email,
          CASE 
            WHEN z.varlik_tipi = 'Donanım' THEN (SELECT marka || ' ' || model FROM donanimlar WHERE id = z.varlik_id)
            WHEN z.varlik_tipi = 'Yazılım' THEN (SELECT yazilim_adi FROM yazilim_lisanslari WHERE id = z.varlik_id)
          END as varlik_adi
        FROM zimmetler z
        JOIN kullanicilar k ON z.kullanici_id = k.id
        WHERE z.kullanici_id = ?
        ORDER BY z.created_at DESC
      `;
      params.push(req.user.id);
    } else {
      query = `
        SELECT z.*, k.ad, k.soyad, k.email,
          CASE 
            WHEN z.varlik_tipi = 'Donanım' THEN (SELECT marka || ' ' || model FROM donanimlar WHERE id = z.varlik_id)
            WHEN z.varlik_tipi = 'Yazılım' THEN (SELECT yazilim_adi FROM yazilim_lisanslari WHERE id = z.varlik_id)
          END as varlik_adi
        FROM zimmetler z
        JOIN kullanicilar k ON z.kullanici_id = k.id
        ORDER BY z.created_at DESC
      `;
    }

    const allocations = db.prepare(query).all(...params);
    res.json(allocations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { kullanici_id, varlik_tipi, varlik_id } = req.body;

    if (!kullanici_id || !varlik_tipi || !varlik_id) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    }

    // IK-1: Arızalı veya Kullanımda donanım atanamaz
    if (varlik_tipi === 'Donanım') {
      const hw = db.prepare('SELECT * FROM donanimlar WHERE id = ?').get(varlik_id);
      if (!hw) return res.status(404).json({ error: 'Donanım bulunamadı.' });
      if (hw.durum !== 'Müsait') {
        return res.status(400).json({ error: `Durumu "${hw.durum}" olan donanım atanamaz. Sadece "Müsait" donanımlar atanabilir.` });
      }
    }

    // IK-2: Süresi dolmuş lisans atanamaz
    if (varlik_tipi === 'Yazılım') {
      const lic = db.prepare('SELECT * FROM yazilim_lisanslari WHERE id = ?').get(varlik_id);
      if (!lic) return res.status(404).json({ error: 'Lisans bulunamadı.' });
      if (lic.durum !== 'Aktif') {
        return res.status(400).json({ error: 'Süresi dolmuş veya pasif lisans atanamaz.' });
      }
    }

    const result = db.prepare(`
      INSERT INTO zimmetler (kullanici_id, varlik_tipi, varlik_id)
      VALUES (?, ?, ?)
    `).run(kullanici_id, varlik_tipi, varlik_id);

    // Donanım durumunu güncelle (henüz onay bekliyor ama reserve et)
    if (varlik_tipi === 'Donanım') {
      db.prepare("UPDATE donanimlar SET durum = 'Kullanımda' WHERE id = ?").run(varlik_id);
    }

    // Kullanıcıya bildirim gönder
    db.prepare(`
      INSERT INTO bildirimler (kullanici_id, baslik, mesaj)
      VALUES (?, 'Zimmet Onay Talebi', 'Size yeni bir varlık zimmetlenmek isteniyor. Lütfen onaylayın veya reddedin.')
    `).run(kullanici_id);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Zimmet talebi oluşturuldu.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Personel onay/red
router.put('/:id/onayla', authenticateToken, (req, res) => {
  try {
    const allocation = db.prepare('SELECT * FROM zimmetler WHERE id = ?').get(req.params.id);
    if (!allocation) return res.status(404).json({ error: 'Zimmet kaydı bulunamadı.' });

    if (allocation.kullanici_id !== req.user.id && req.user.rol_adi === 'Personel') {
      return res.status(403).json({ error: 'Sadece kendi zimmet taleplerinizi onaylayabilirsiniz.' });
    }

    db.prepare("UPDATE zimmetler SET onay_durumu = 'Onaylandı' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Zimmet onaylandı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/reddet', authenticateToken, (req, res) => {
  try {
    const allocation = db.prepare('SELECT * FROM zimmetler WHERE id = ?').get(req.params.id);
    if (!allocation) return res.status(404).json({ error: 'Zimmet kaydı bulunamadı.' });

    db.prepare("UPDATE zimmetler SET onay_durumu = 'Reddedildi' WHERE id = ?").run(req.params.id);

    if (allocation.varlik_tipi === 'Donanım') {
      db.prepare("UPDATE donanimlar SET durum = 'Müsait' WHERE id = ?").run(allocation.varlik_id);
    }

    res.json({ message: 'Zimmet reddedildi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IK-3: İade süreci - önce depoya iade
router.put('/:id/iade', authenticateToken, (req, res) => {
  try {
    const allocation = db.prepare('SELECT * FROM zimmetler WHERE id = ?').get(req.params.id);
    if (!allocation) return res.status(404).json({ error: 'Zimmet kaydı bulunamadı.' });

    if (allocation.onay_durumu === 'İade Edildi') {
      return res.status(400).json({ error: 'Bu zimmet zaten iade edilmiş.' });
    }

    db.prepare(`
      UPDATE zimmetler SET onay_durumu = 'İade Edildi', iade_tarihi = date('now') WHERE id = ?
    `).run(req.params.id);

    if (allocation.varlik_tipi === 'Donanım') {
      db.prepare("UPDATE donanimlar SET durum = 'Müsait' WHERE id = ?").run(allocation.varlik_id);
    }

    res.json({ message: 'Varlık başarıyla iade edildi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
