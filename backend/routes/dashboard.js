/**
 * Yönetim paneli metrikleri: özet sayılar, süresi dolmak üzere olan
 * lisans dilimleri, dağılım grafikleri (donanım, bilet) için veri.
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/* Kart üst sayımlar ve bu ay biten lisans toplamı */
router.get('/summary', authenticateToken, authorizeRoles('IT Müdürü', 'IT Destek'), (req, res) => {
  try {
    const totalHardware = db.prepare("SELECT COUNT(*) as count FROM donanimlar WHERE durum != 'Pasif'").get();
    const totalLicenses = db.prepare("SELECT COUNT(*) as count FROM yazilim_lisanslari WHERE durum != 'Pasif'").get();
    const activeAllocations = db.prepare("SELECT COUNT(*) as count FROM zimmetler WHERE onay_durumu = 'Onaylandı' AND iade_tarihi IS NULL").get();
    const openTickets = db.prepare("SELECT COUNT(*) as count FROM ariza_talepleri WHERE durum != 'Çözüldü'").get();

    const expiringThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM yazilim_lisanslari 
      WHERE durum = 'Aktif' AND bitis_tarihi IS NOT NULL
        AND bitis_tarihi BETWEEN date('now') AND date('now', '+30 days')
    `).get();

    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM kullanicilar WHERE aktif = 1").get();

    res.json({
      toplam_donanim: totalHardware.count,
      toplam_lisans: totalLicenses.count,
      aktif_zimmetler: activeAllocations.count,
      acik_talepler: openTickets.count,
      bu_ay_biten_lisanslar: expiringThisMonth.count,
      toplam_kullanici: totalUsers.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FG-9: Yaklaşan lisans maliyetleri
router.get('/license-costs', authenticateToken, authorizeRoles('IT Müdürü', 'Satınalma'), (req, res) => {
  try {
    const next30 = db.prepare(`
      SELECT id, yazilim_adi, bitis_tarihi, maliyet FROM yazilim_lisanslari
      WHERE durum = 'Aktif' AND bitis_tarihi IS NOT NULL
        AND bitis_tarihi BETWEEN date('now') AND date('now', '+30 days')
      ORDER BY bitis_tarihi
    `).all();

    const next60 = db.prepare(`
      SELECT id, yazilim_adi, bitis_tarihi, maliyet FROM yazilim_lisanslari
      WHERE durum = 'Aktif' AND bitis_tarihi IS NOT NULL
        AND bitis_tarihi BETWEEN date('now', '+31 days') AND date('now', '+60 days')
      ORDER BY bitis_tarihi
    `).all();

    const next90 = db.prepare(`
      SELECT id, yazilim_adi, bitis_tarihi, maliyet FROM yazilim_lisanslari
      WHERE durum = 'Aktif' AND bitis_tarihi IS NOT NULL
        AND bitis_tarihi BETWEEN date('now', '+61 days') AND date('now', '+90 days')
      ORDER BY bitis_tarihi
    `).all();

    const cost30 = next30.reduce((sum, l) => sum + (l.maliyet || 0), 0);
    const cost60 = next60.reduce((sum, l) => sum + (l.maliyet || 0), 0);
    const cost90 = next90.reduce((sum, l) => sum + (l.maliyet || 0), 0);

    res.json({
      periods: [
        { label: '30 Gün', licenses: next30, totalCost: cost30 },
        { label: '60 Gün', licenses: next60, totalCost: cost60 },
        { label: '90 Gün', licenses: next90, totalCost: cost90 }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FG-9: Departman bazlı donanım dağılımı
router.get('/department-distribution', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const distribution = db.prepare(`
      SELECT d.departman_adi, COUNT(z.id) as donanim_sayisi
      FROM departmanlar d
      LEFT JOIN kullanicilar k ON k.departman_id = d.id
      LEFT JOIN zimmetler z ON z.kullanici_id = k.id AND z.varlik_tipi = 'Donanım' 
        AND z.onay_durumu = 'Onaylandı' AND z.iade_tarihi IS NULL
      GROUP BY d.id, d.departman_adi
      ORDER BY donanim_sayisi DESC
    `).all();

    res.json(distribution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FG-9: Arıza çözüm süreleri
router.get('/ticket-stats', authenticateToken, authorizeRoles('IT Müdürü', 'IT Destek'), (req, res) => {
  try {
    const statusCounts = db.prepare(`
      SELECT durum, COUNT(*) as count FROM ariza_talepleri GROUP BY durum
    `).all();

    const avgResolution = db.prepare(`
      SELECT AVG(julianday(cozum_tarihi) - julianday(talep_tarihi)) as avg_days
      FROM ariza_talepleri
      WHERE durum = 'Çözüldü' AND cozum_tarihi IS NOT NULL
    `).get();

    const monthlyTickets = db.prepare(`
      SELECT strftime('%Y-%m', talep_tarihi) as ay, COUNT(*) as count
      FROM ariza_talepleri
      GROUP BY strftime('%Y-%m', talep_tarihi)
      ORDER BY ay DESC
      LIMIT 6
    `).all();

    res.json({
      durum_dagilimi: statusCounts,
      ortalama_cozum_suresi: avgResolution.avg_days ? Math.round(avgResolution.avg_days * 10) / 10 : 0,
      aylik_talepler: monthlyTickets.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
