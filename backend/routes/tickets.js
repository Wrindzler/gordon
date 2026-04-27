/**
 * Arıza talepleri: personel sadece kendine ait biletleri listeler;
 * IT/Destek tüm açık kayıtları yönetir, çözüldüğünde donanım durumu
 * geri alınabilir.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    let query, params = [];

    if (req.user.rol_adi === 'Personel') {
      query = `
        SELECT at.*, k.ad, k.soyad, d.marka, d.model, d.seri_no
        FROM ariza_talepleri at
        JOIN kullanicilar k ON at.kullanici_id = k.id
        JOIN donanimlar d ON at.donanim_id = d.id
        WHERE at.kullanici_id = ?
        ORDER BY at.created_at DESC
      `;
      params.push(req.user.id);
    } else {
      query = `
        SELECT at.*, k.ad, k.soyad, d.marka, d.model, d.seri_no
        FROM ariza_talepleri at
        JOIN kullanicilar k ON at.kullanici_id = k.id
        JOIN donanimlar d ON at.donanim_id = d.id
        ORDER BY at.created_at DESC
      `;
    }

    const tickets = db.prepare(query).all(...params);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const ticket = db.prepare(`
      SELECT at.*, k.ad, k.soyad, d.marka, d.model, d.seri_no
      FROM ariza_talepleri at
      JOIN kullanicilar k ON at.kullanici_id = k.id
      JOIN donanimlar d ON at.donanim_id = d.id
      WHERE at.id = ?
    `).get(req.params.id);

    if (!ticket) return res.status(404).json({ error: 'Arıza talebi bulunamadı.' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Personel arıza talebi oluşturur
router.post('/', authenticateToken, (req, res) => {
  try {
    const { donanim_id, sorun_aciklamasi } = req.body;

    if (!donanim_id || !sorun_aciklamasi) {
      return res.status(400).json({ error: 'Donanım ve sorun açıklaması zorunludur.' });
    }

    // Donanımın kullanıcıya zimmetli olup olmadığını kontrol et
    const allocation = db.prepare(`
      SELECT id FROM zimmetler 
      WHERE kullanici_id = ? AND varlik_tipi = 'Donanım' AND varlik_id = ? 
        AND onay_durumu = 'Onaylandı' AND iade_tarihi IS NULL
    `).get(req.user.id, donanim_id);

    if (!allocation && req.user.rol_adi === 'Personel') {
      return res.status(400).json({ error: 'Bu donanım size zimmetli değil. Sadece zimmetli cihazlarınız için arıza talebi açabilirsiniz.' });
    }

    const result = db.prepare(`
      INSERT INTO ariza_talepleri (kullanici_id, donanim_id, sorun_aciklamasi)
      VALUES (?, ?, ?)
    `).run(req.user.id, donanim_id, sorun_aciklamasi);

    db.prepare("UPDATE donanimlar SET durum = 'Arızalı' WHERE id = ?").run(donanim_id);

    // IT Destek ekibine bildirim
    const itSupport = db.prepare(`
      SELECT id FROM kullanicilar WHERE rol_id = (SELECT id FROM roller WHERE rol_adi = 'IT Destek') AND aktif = 1
    `).all();

    const insertNotif = db.prepare(`
      INSERT INTO bildirimler (kullanici_id, baslik, mesaj)
      VALUES (?, 'Yeni Arıza Talebi', ?)
    `);

    itSupport.forEach(u => {
      insertNotif.run(u.id, `Yeni bir arıza talebi oluşturuldu: ${sorun_aciklamasi.substring(0, 100)}`);
    });

    res.status(201).json({ id: result.lastInsertRowid, message: 'Arıza talebi oluşturuldu.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IT Destek durum günceller
router.put('/:id', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { durum } = req.body;
    if (!durum) return res.status(400).json({ error: 'Durum alanı zorunludur.' });

    const ticket = db.prepare('SELECT * FROM ariza_talepleri WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Arıza talebi bulunamadı.' });

    const updates = { durum };
    if (durum === 'Çözüldü') {
      updates.cozum_tarihi = new Date().toISOString().split('T')[0];
      db.prepare("UPDATE donanimlar SET durum = 'Kullanımda' WHERE id = ?").run(ticket.donanim_id);
    }

    db.prepare(`
      UPDATE ariza_talepleri SET durum = ?, cozum_tarihi = COALESCE(?, cozum_tarihi)
      WHERE id = ?
    `).run(durum, updates.cozum_tarihi || null, req.params.id);

    // Kullanıcıya bildirim
    db.prepare(`
      INSERT INTO bildirimler (kullanici_id, baslik, mesaj)
      VALUES (?, 'Arıza Talebi Güncellendi', ?)
    `).run(ticket.kullanici_id, `Arıza talebinizin durumu "${durum}" olarak güncellendi.`);

    res.json({ message: 'Arıza talebi güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
