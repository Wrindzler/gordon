/**
 * Yazılım lisansı CRUD uçları: listeleme, zimmetli kişi birleşimi, boş
 * müsait lisans sorgusu, bitişe göre durum türetimi (PUT sırasında
 * `resolveLicenseDurumAfterEdit` ile), pasife alma (soft delete benzeri).
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/** YYYY-MM-DD, yerel takvim (arayüzle uyum) */
function todayYmdLocal() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/**
 * bitis_tarihi ile durum alanını hizala: ileri tarih verilip hâlâ "Süresi Dolmuş" kaydı kalmasın;
 * geçmiş bitiş + Aktif tutarsızlığını gider.
 */
function resolveLicenseDurumAfterEdit(item, body) {
  const effectiveBitis =
    body.bitis_tarihi !== undefined && body.bitis_tarihi !== null ? body.bitis_tarihi : item.bitis_tarihi;
  let finalDurum = body.durum !== undefined && body.durum !== null && body.durum !== '' ? body.durum : item.durum;

  const endStr = effectiveBitis ? String(effectiveBitis).slice(0, 10) : null;
  const todayStr = todayYmdLocal();

  if (!endStr || finalDurum === 'Pasif') {
    return finalDurum;
  }
  if (endStr >= todayStr && item.durum === 'Süresi Dolmuş') {
    return 'Aktif';
  }
  if (endStr < todayStr && (finalDurum === 'Aktif' || finalDurum === 'Süresi Dolmuş')) {
    return 'Süresi Dolmuş';
  }
  return finalDurum;
}

/* Tüm pasif dışı lisanslar; onaylı zimmetle kullanıcı adı birleştirilmiştir. */
router.get('/', authenticateToken, (req, res) => {
  try {
    const licenses = db.prepare(`
      SELECT yl.*,
        CASE WHEN z.id IS NOT NULL THEN (k.ad || ' ' || k.soyad) ELSE NULL END as zimmetli_kisi
      FROM yazilim_lisanslari yl
      LEFT JOIN zimmetler z ON z.varlik_tipi = 'Yazılım' AND z.varlik_id = yl.id 
        AND z.onay_durumu = 'Onaylandı' AND z.iade_tarihi IS NULL
      LEFT JOIN kullanicilar k ON z.kullanici_id = k.id
      WHERE yl.durum != 'Pasif'
      ORDER BY yl.created_at DESC
    `).all();
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Zimmet atanmamış, aktif lisanslar (yeni atama için) */
router.get('/aktif', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const licenses = db.prepare(`
      SELECT yl.* FROM yazilim_lisanslari yl
      LEFT JOIN zimmetler z ON z.varlik_tipi = 'Yazılım' AND z.varlik_id = yl.id 
        AND z.onay_durumu = 'Onaylandı' AND z.iade_tarihi IS NULL
      WHERE yl.durum = 'Aktif' AND z.id IS NULL
      ORDER BY yl.yazilim_adi
    `).all();
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Tekil lisans; form düzenleme için */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM yazilim_lisanslari WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Lisans bulunamadı.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Oluşturma: ad zorunlu, varsayılan durum veritabanı “Aktif” */
router.post('/', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { yazilim_adi, lisans_anahtari, baslangic_tarihi, bitis_tarihi, maliyet } = req.body;
    if (!yazilim_adi) {
      return res.status(400).json({ error: 'Yazılım adı zorunludur.' });
    }

    const result = db.prepare(`
      INSERT INTO yazilim_lisanslari (yazilim_adi, lisans_anahtari, baslangic_tarihi, bitis_tarihi, maliyet)
      VALUES (?, ?, ?, ?, ?)
    `).run(yazilim_adi, lisans_anahtari || null, baslangic_tarihi || null, bitis_tarihi || null, maliyet || 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Lisans eklendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Güncelleme: bitiş/durum tutarlılığı `resolveLicenseDurumAfterEdit` ile sağlanır. */
router.put('/:id', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    const { yazilim_adi, lisans_anahtari, baslangic_tarihi, bitis_tarihi, maliyet, durum } = req.body;
    const item = db.prepare('SELECT * FROM yazilim_lisanslari WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Lisans bulunamadı.' });

    const finalDurum = resolveLicenseDurumAfterEdit(item, req.body);

    // IK-2: Açıkça Aktif istenirken bitiş hâlâ geçmişteyse
    if (durum === 'Aktif' && item.durum === 'Süresi Dolmuş') {
      const endDate = bitis_tarihi || item.bitis_tarihi;
      const endStr = endDate ? String(endDate).slice(0, 10) : null;
      if (endStr && endStr < todayYmdLocal()) {
        return res.status(400).json({ error: 'Süresi dolmuş bir lisans aktife alınamaz. Önce bitiş tarihini güncelleyin.' });
      }
    }

    db.prepare(`
      UPDATE yazilim_lisanslari 
      SET yazilim_adi = ?, lisans_anahtari = ?, baslangic_tarihi = ?, bitis_tarihi = ?, maliyet = ?, durum = ?
      WHERE id = ?
    `).run(
      yazilim_adi || item.yazilim_adi,
      lisans_anahtari !== undefined ? lisans_anahtari : item.lisans_anahtari,
      baslangic_tarihi !== undefined ? baslangic_tarihi : item.baslangic_tarihi,
      bitis_tarihi !== undefined ? bitis_tarihi : item.bitis_tarihi,
      maliyet !== undefined ? maliyet : item.maliyet,
      finalDurum,
      req.params.id
    );

    res.json({ message: 'Lisans güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Silme yerine `Pasif` (envanterde kalır) */
router.delete('/:id', authenticateToken, authorizeRoles('IT Destek', 'IT Müdürü'), (req, res) => {
  try {
    db.prepare("UPDATE yazilim_lisanslari SET durum = 'Pasif' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Lisans pasife alındı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
