/**
 * Lisans süre takibi: yaklaşan bitişler için in-app bildirim üretimi,
 * bitişi geçmiş `Aktif` kayıtların işaretlenmesi, yenilenmiş fakat hâlâ
 * `Süresi Dolmuş` görünen satırların düzeltilmesi. Cron ve sunucu açılışı
 * tarafından çağrılır.
 */
const { db } = require('../config/db');

/* Sabit: uyarı pencereleri (gün) ve hedef roller (Satınalma, IT Müdürü) */
const PERIODS = [
  { days: 30, label: '30 gün' },
  { days: 15, label: '15 gün' },
  { days: 7, label: '7 gün' },
];

const ROLES_TO_NOTIFY = ['Satınalma', 'IT Müdürü'];

/* Benzersizlik: aynı lisans+periyod için tekrar bildirim üretilmesi engellenir. */
function buildTag(licenseId, days) {
  return `[LIC:${licenseId}|TRIG:${days}]`;
}

// FG-8: Bitiş tarihine 30, 15 ve 7 gün kalan lisansları tespit eder;
// Satınalma Sorumlusu ve IT Müdürüne, her lisans için ayrı bir
// uygulama içi bildirim üretir. Tekrar üretimi önlemek için mesajın
// içine makine-okunabilir etiket yerleştirilir.
function checkExpiringLicenses() {
  const stats = { periods: {}, totalCreated: 0, totalSkipped: 0 };

  const recipients = db.prepare(`
    SELECT k.id, k.ad, k.soyad, k.email, r.rol_adi
    FROM kullanicilar k
    JOIN roller r ON k.rol_id = r.id
    WHERE r.rol_adi IN (${ROLES_TO_NOTIFY.map(() => '?').join(',')})
      AND k.aktif = 1
  `).all(...ROLES_TO_NOTIFY);

  if (recipients.length === 0) {
    console.warn('[NOTIF] Bildirim alıcı rolü bulunamadı (Satınalma / IT Müdürü).');
    return stats;
  }

  const findExisting = db.prepare(`
    SELECT id FROM bildirimler
    WHERE kullanici_id = ? AND mesaj LIKE ?
    LIMIT 1
  `);

  const insertNotif = db.prepare(`
    INSERT INTO bildirimler (kullanici_id, baslik, mesaj)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((jobs) => {
    for (const j of jobs) insertNotif.run(j.userId, j.title, j.message);
  });

  PERIODS.forEach(({ days, label }) => {
    const licenses = db.prepare(`
      SELECT * FROM yazilim_lisanslari
      WHERE durum = 'Aktif'
        AND bitis_tarihi IS NOT NULL
        AND bitis_tarihi = date('now', ?)
    `).all(`+${days} days`);

    stats.periods[label] = { licenses: licenses.length, notifications: 0, skipped: 0 };

    if (licenses.length === 0) return;

    const jobs = [];

    licenses.forEach((license) => {
      const tag = buildTag(license.id, days);
      recipients.forEach((user) => {
        const exists = findExisting.get(user.id, `%${tag}%`);
        if (exists) {
          stats.periods[label].skipped += 1;
          stats.totalSkipped += 1;
          return;
        }

        const title = 'Lisans Süresi Dolmak Üzere';
        const maliyet = Number(license.maliyet || 0).toLocaleString('tr-TR');
        const message =
          `"${license.yazilim_adi}" lisansının süresi ${label} içinde (${license.bitis_tarihi}) dolacaktır. ` +
          `Tahmini yenileme maliyeti: ${maliyet} TL. ${tag}`;

        jobs.push({ userId: user.id, title, message });
        stats.periods[label].notifications += 1;
        stats.totalCreated += 1;
      });
    });

    if (jobs.length) insertMany(jobs);
  });

  console.log(
    `[NOTIF] Lisans kontrolü tamamlandı. ${recipients.length} alıcı. ` +
    `Oluşturulan: ${stats.totalCreated}, atlanan (zaten var): ${stats.totalSkipped}. ` +
    `Detay: ${JSON.stringify(stats.periods)}`
  );

  return stats;
}

// Bitiş tarihi bugünden sonra olup hâlâ "Süresi Dolmuş" kalan kayıtları Aktif yapar (ör. yenileme sonrası tutarsızlık).
function reactivateRenewedLicenses() {
  const info = db.prepare(`
    UPDATE yazilim_lisanslari
    SET durum = 'Aktif'
    WHERE durum = 'Süresi Dolmuş'
      AND bitis_tarihi IS NOT NULL
      AND bitis_tarihi >= date('now')
  `).run();
  if (info.changes > 0) {
    console.log(`[NOTIF] ${info.changes} lisans bitişi güncel → "Aktif" yapıldı.`);
  }
  return info.changes;
}

// Süresi dolmuş lisansları otomatik "Süresi Dolmuş" olarak işaretler.
function updateExpiredLicenses() {
  const info = db.prepare(`
    UPDATE yazilim_lisanslari
    SET durum = 'Süresi Dolmuş'
    WHERE durum = 'Aktif' AND bitis_tarihi IS NOT NULL AND bitis_tarihi < date('now')
  `).run();
  if (info.changes > 0) {
    console.log(`[NOTIF] ${info.changes} lisans "Süresi Dolmuş" olarak işaretlendi.`);
  }
  return info.changes;
}

module.exports = {
  checkExpiringLicenses,
  reactivateRenewedLicenses,
  updateExpiredLicenses,
  PERIODS,
  ROLES_TO_NOTIFY,
};
