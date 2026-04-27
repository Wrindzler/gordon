/**
 * Kullanıcı yönetimi: listeleme, oluşturma, güncelleme, pasife alma,
 * IT tarafından şifre sıfırlama (geçici parola + e-posta). Geçici şifre
 * üretimi okunabilir karakter setiyle politika uyumlu yapılır.
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const mailService = require('../services/mail');
const { assertPasswordValid } = require('../utils/passwordPolicy');

const router = express.Router();

/**
 * Kurumsal ortam için okunabilir, güvenli geçici şifre üretir.
 * Karışık görünümlü karakterler (0/O/o/I/l/1) dışlanır; IT telefonda
 * karakter karakter okurken hata yapılmasın diye.
 */
function generateTempPassword(len = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*?+';
  const all = upper + lower + digits + symbols;
  const minLen = Math.max(len, 8);
  const rand = (max) => crypto.randomBytes(4).readUInt32BE(0) % max;
  // Politika gereği her kategoriden en az bir karakter garanti ediliyor
  const chars = [
    upper[rand(upper.length)],
    lower[rand(lower.length)],
    digits[rand(digits.length)],
    symbols[rand(symbols.length)],
  ];
  for (let i = chars.length; i < minLen; i++) chars.push(all[rand(all.length)]);
  // Fisher-Yates karıştırma
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

router.get('/', authenticateToken, authorizeRoles('IT Müdürü', 'IT Destek'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, k.departman_id, k.rol_id, k.aktif, k.created_at,
             r.rol_adi, d.departman_adi
      FROM kullanicilar k
      JOIN roller r ON k.rol_id = r.id
      LEFT JOIN departmanlar d ON k.departman_id = d.id
      ORDER BY k.created_at DESC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/personel', authenticateToken, authorizeRoles('IT Müdürü', 'IT Destek'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, d.departman_adi
      FROM kullanicilar k
      LEFT JOIN departmanlar d ON k.departman_id = d.id
      WHERE k.aktif = 1
      ORDER BY k.ad
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, k.departman_id, k.rol_id, k.aktif, k.created_at,
             r.rol_adi, d.departman_adi
      FROM kullanicilar k
      JOIN roller r ON k.rol_id = r.id
      LEFT JOIN departmanlar d ON k.departman_id = d.id
      WHERE k.id = ?
    `).get(req.params.id);

    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const { ad, soyad, email, sifre, departman_id, rol_id, aktif } = req.body;
    const userId = req.params.id;

    const user = db.prepare('SELECT * FROM kullanicilar WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    let hash = user.sifre_hash;
    const passwordChanged = Boolean(sifre);
    if (passwordChanged) {
      const pwdCheck = assertPasswordValid(sifre);
      if (!pwdCheck.ok) {
        return res.status(400).json({ error: pwdCheck.error });
      }
      const salt = bcrypt.genSaltSync(10);
      hash = bcrypt.hashSync(sifre, salt);
    }

    // IT tarafından atanan her şifre, güvenlik gereği geçicidir:
    // kullanıcı ilk girişte kendi şifresini belirlemek zorunda kalır.
    const mustChangeFlag = passwordChanged ? 1 : user.sifre_degistirilmeli;

    db.prepare(`
      UPDATE kullanicilar 
      SET ad = ?, soyad = ?, email = ?, sifre_hash = ?, departman_id = ?, rol_id = ?, aktif = ?, sifre_degistirilmeli = ?
      WHERE id = ?
    `).run(
      ad || user.ad,
      soyad || user.soyad,
      email || user.email,
      hash,
      departman_id !== undefined ? departman_id : user.departman_id,
      rol_id || user.rol_id,
      aktif !== undefined ? aktif : user.aktif,
      mustChangeFlag,
      userId
    );

    if (passwordChanged) {
      // Etkin/beklemede sıfırlama tokenlarını iptal et
      db.prepare(`UPDATE sifre_sifirlama_tokenlari SET kullanildi = 1 WHERE kullanici_id = ? AND kullanildi = 0`).run(userId);
      try {
        db.prepare(`INSERT INTO bildirimler (kullanici_id, baslik, mesaj) VALUES (?, ?, ?)`).run(
          userId,
          'Şifreniz sıfırlandı',
          'Hesabınızın şifresi IT yönetimi tarafından sıfırlandı. Sisteme giriş yaptığınızda güvenliğiniz için yeni bir şifre belirlemeniz istenecektir.'
        );
      } catch (_) {}
    }

    res.json({ message: passwordChanged ? 'Kullanıcı güncellendi. Şifre geçici olarak işaretlendi; kullanıcı ilk girişte değiştirmek zorunda kalacak.' : 'Kullanıcı güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * IT Müdürü tarafından şifre sıfırlama (admin reset).
 *
 * - İstek gövdesinde `sifre` varsa onu kullanır; yoksa güvenli/okunabilir
 *   bir geçici şifre üretir.
 * - Kullanıcı `sifre_degistirilmeli = 1` olarak işaretlenir: ilk girişte
 *   zorunlu şifre değiştirme ekranına yönlendirilecektir.
 * - Varsa açık sıfırlama tokenları iptal edilir.
 * - Hedef kullanıcıya uygulama içi bildirim düşer; SMTP yapılandırılmışsa
 *   e-posta ile geçici şifre de gönderilir.
 * - Geçici şifre yanıtta TEK SEFERLİK döner; frontend bunu IT'ye gösterir
 *   ve IT güvenli kanaldan kullanıcıya iletir.
 */
router.post('/:id/reset-password', authenticateToken, authorizeRoles('IT Müdürü'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { sifre } = req.body || {};

    const user = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, k.aktif
      FROM kullanicilar k
      WHERE k.id = ?
    `).get(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (!user.aktif) return res.status(400).json({ error: 'Pasif kullanıcının şifresi sıfırlanamaz.' });

    const tempPassword = sifre ? String(sifre) : generateTempPassword(12);
    if (sifre) {
      // Yalnızca manuel girilen şifreyi doğrula; otomatik üretilen politikaya
      // uygun üretildiği için ekstra kontrole gerek yoktur.
      const pwdCheck = assertPasswordValid(tempPassword);
      if (!pwdCheck.ok) {
        return res.status(400).json({ error: pwdCheck.error });
      }
    }

    const hash = bcrypt.hashSync(tempPassword, bcrypt.genSaltSync(10));

    const tx = db.transaction(() => {
      db.prepare(`UPDATE kullanicilar SET sifre_hash = ?, sifre_degistirilmeli = 1 WHERE id = ?`)
        .run(hash, userId);
      db.prepare(`UPDATE sifre_sifirlama_tokenlari SET kullanildi = 1 WHERE kullanici_id = ? AND kullanildi = 0`)
        .run(userId);
      db.prepare(`INSERT INTO bildirimler (kullanici_id, baslik, mesaj) VALUES (?, ?, ?)`).run(
        userId,
        'Şifreniz sıfırlandı',
        'Hesabınızın şifresi IT yönetimi tarafından sıfırlandı. Geçici şifrenizi IT\'den aldıktan sonra giriş yapın; sistem ilk girişte güvenliğiniz için yeni bir şifre belirlemenizi isteyecek.'
      );
    });
    tx();

    let mailResult = { sent: false, reason: 'SMTP devre dışı' };
    if (mailService.isConfigured()) {
      try {
        mailResult = await mailService.sendPasswordChangedByItEmail({ user, temporaryPassword: tempPassword });
      } catch (e) {
        mailResult = { sent: false, reason: e.message };
      }
    }

    res.json({
      message: 'Geçici şifre oluşturuldu. Kullanıcıya güvenli bir kanaldan iletin; ilk girişte kendi şifresini belirlemesi istenecek.',
      gecici_sifre: tempPassword,
      mail_gonderildi: mailResult.sent,
      mail_reason: mailResult.reason || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

// IK-5: Aktif zimmeti veya çözülmemiş arıza kaydı varsa silinemez
router.delete('/:id', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const userId = req.params.id;

    const activeAllocation = db.prepare(`
      SELECT id FROM zimmetler 
      WHERE kullanici_id = ? AND onay_durumu IN ('Onay Bekliyor', 'Onaylandı')
    `).get(userId);

    if (activeAllocation) {
      return res.status(400).json({
        error: 'Aktif zimmeti bulunan kullanıcı silinemez. Önce zimmetleri iade edilmelidir.'
      });
    }

    const openTicket = db.prepare(`
      SELECT id FROM ariza_talepleri 
      WHERE kullanici_id = ? AND durum != 'Çözüldü'
    `).get(userId);

    if (openTicket) {
      return res.status(400).json({
        error: 'Çözülmemiş arıza kaydı bulunan kullanıcı silinemez.'
      });
    }

    db.prepare('UPDATE kullanicilar SET aktif = 0 WHERE id = ?').run(userId);
    res.json({ message: 'Kullanıcı pasife alındı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
