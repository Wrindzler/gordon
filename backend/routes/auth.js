/**
 * Kimlik: giriş, /me, şifre değişiklikleri, self-servis/IT destekli
 * sıfırlama, token saklama. E-posta isteğe bağlı; audit ve bildirim
 * eşiği tarafından tamamlanır.
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../services/auditLog');
const mailService = require('../services/mail');
const { assertPasswordValid } = require('../utils/passwordPolicy');
require('dotenv').config();

const router = express.Router();

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

/* Ham belirteç SHA-256 hash’e çevrilir; veritabanında sadece hash saklanır. */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/* Yönlendirilecek self-servis sayfa: APP_URL + /sifre-sifirla/{token} */
function buildResetUrl(rawToken) {
  const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/sifre-sifirla/${rawToken}`;
}

/* Oturum: şifre bcrypt ile karşılaştırılır, JWT 24h üretilir, audit yazılır. */
router.post('/login', (req, res) => {
  try {
    const { email, sifre } = req.body;
    if (!email || !sifre) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir.' });
    }

    const user = db.prepare(`
      SELECT k.*, r.rol_adi FROM kullanicilar k
      JOIN roller r ON k.rol_id = r.id
      WHERE k.email = ?
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı.' });
    }

    if (!user.aktif) {
      return res.status(401).json({ error: 'Hesabınız pasif durumdadır.' });
    }

    const validPassword = bcrypt.compareSync(sifre, user.sifre_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email veya şifre hatalı.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.rol_adi },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logActivity({
      kullanici_id: user.id,
      kullanici_email: user.email,
      kullanici_rol: user.rol_adi,
      yontem: 'POST',
      yol: '/api/auth/login',
      aciklama: 'Sisteme giriş yapıldı',
      detay: null,
    });

    res.json({
      token,
      user: {
        id: user.id,
        ad: user.ad,
        soyad: user.soyad,
        email: user.email,
        rol: user.rol_adi,
        departman_id: user.departman_id,
        sifre_degistirilmeli: user.sifre_degistirilmeli ? 1 : 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

/**
 * Şifre sıfırlama talebi:
 * - Kullanıcıya (varsa) süreli tek kullanımlık sıfırlama linki e-postası gönderilir.
 * - IT Müdürüne her durumda bildirim düşer (audit/uyum).
 * - Kullanıcı sayımını ifşa etmemek için yanıt her zaman genel/olumludur.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
    }

    const user = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, k.aktif
      FROM kullanicilar k
      WHERE LOWER(k.email) = ?
    `).get(email);

    const smtpActive = mailService.isConfigured();

    const itManagers = db.prepare(`
      SELECT k.id FROM kullanicilar k
      JOIN roller r ON k.rol_id = r.id
      WHERE r.rol_adi = 'IT Müdürü' AND k.aktif = 1
    `).all();

    const insertNotif = db.prepare(`
      INSERT INTO bildirimler (kullanici_id, baslik, mesaj)
      VALUES (?, ?, ?)
    `);

    if (user && user.aktif) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);

      // Aynı kullanıcının aktif tokenlarını iptal et
      db.prepare(`UPDATE sifre_sifirlama_tokenlari SET kullanildi = 1 WHERE kullanici_id = ? AND kullanildi = 0`).run(user.id);

      db.prepare(`
        INSERT INTO sifre_sifirlama_tokenlari (kullanici_id, token_hash, son_gecerlilik)
        VALUES (?, ?, ?)
      `).run(user.id, tokenHash, expiresAt);

      const resetUrl = buildResetUrl(rawToken);

      // E-posta (SMTP yoksa sessizce log)
      let mailResult = { sent: false, reason: 'SMTP devre dışı' };
      if (smtpActive) {
        mailResult = await mailService.sendPasswordResetEmail({
          user,
          resetUrl,
          expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
        });
      }

      const msg =
        `"${user.ad} ${user.soyad}" (${user.email}) için şifre sıfırlama talebi alındı. ` +
        `E-posta: ${mailResult.sent ? 'gönderildi' : 'gönderilemedi (SMTP yapılandırılmamış veya hata)'}. ` +
        `Tarih: ${new Date().toLocaleString('tr-TR')}. ` +
        `Gerekirse "Kullanıcı Yönetimi"nden manuel geçici şifre atayabilirsiniz.`;

      itManagers.forEach((row) => {
        insertNotif.run(row.id, 'Şifre sıfırlama talebi', msg);
      });

      logActivity({
        kullanici_id: null,
        kullanici_email: user.email,
        kullanici_rol: null,
        yontem: 'POST',
        yol: '/api/auth/forgot-password',
        aciklama: 'Şifre sıfırlama talebi',
        detay: JSON.stringify({ mail_sent: mailResult.sent, reason: mailResult.reason || null }),
      });
    } else {
      // Kullanıcı yok veya pasif — yine de IT'ye bildir (gözetim), ama yanıt genel kalsın.
      const etiket = user ? 'pasif hesap' : 'bilinmeyen e-posta';
      const msg =
        `Geçersiz bir şifre sıfırlama talebi alındı (${etiket}): ${email}. ` +
        `Tarih: ${new Date().toLocaleString('tr-TR')}.`;
      itManagers.forEach((row) => {
        insertNotif.run(row.id, 'Şifre sıfırlama talebi (geçersiz)', msg);
      });
    }

    const genericMessage = smtpActive
      ? 'Eğer bu e-posta sistemde kayıtlı ve aktifse, şifre sıfırlama bağlantısı ilgili adrese gönderilmiştir. IT yönetimi de bilgilendirildi.'
      : 'Talebiniz alındı ve IT yönetimine iletildi. IT ekibi sizinle iletişime geçecek ve geçici bir şifre sağlayacaktır.';

    res.json({ message: genericMessage, smtp_active: smtpActive });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

/** Token geçerli mi? Reset ekranı açılırken kullanılır. */
router.get('/reset-password/:token', (req, res) => {
  try {
    const raw = String(req.params.token || '');
    if (!raw) return res.status(400).json({ valid: false, error: 'Token gereklidir.' });
    const tokenHash = hashToken(raw);

    const row = db.prepare(`
      SELECT t.id, t.kullanici_id, t.son_gecerlilik, t.kullanildi, k.email, k.ad, k.aktif
      FROM sifre_sifirlama_tokenlari t
      JOIN kullanicilar k ON k.id = t.kullanici_id
      WHERE t.token_hash = ?
    `).get(tokenHash);

    if (!row || row.kullanildi || !row.aktif) {
      return res.status(400).json({ valid: false, error: 'Bağlantı geçersiz veya daha önce kullanılmış.' });
    }
    if (new Date(row.son_gecerlilik.replace(' ', 'T') + 'Z') < new Date()) {
      return res.status(400).json({ valid: false, error: 'Bağlantının süresi dolmuş. Lütfen yeni bir talep oluşturun.' });
    }
    res.json({ valid: true, email: row.email, ad: row.ad });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Sunucu hatası: ' + err.message });
  }
});

/** Token ile yeni şifre belirleme */
router.post('/reset-password', (req, res) => {
  try {
    const { token, sifre } = req.body || {};
    if (!token || !sifre) {
      return res.status(400).json({ error: 'Token ve yeni şifre gereklidir.' });
    }
    const pwdCheck = assertPasswordValid(sifre);
    if (!pwdCheck.ok) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const tokenHash = hashToken(String(token));
    const row = db.prepare(`
      SELECT t.id, t.kullanici_id, t.son_gecerlilik, t.kullanildi, k.email, k.ad, k.soyad, k.aktif, r.rol_adi
      FROM sifre_sifirlama_tokenlari t
      JOIN kullanicilar k ON k.id = t.kullanici_id
      JOIN roller r ON k.rol_id = r.id
      WHERE t.token_hash = ?
    `).get(tokenHash);

    if (!row || row.kullanildi || !row.aktif) {
      return res.status(400).json({ error: 'Bağlantı geçersiz veya daha önce kullanılmış.' });
    }
    if (new Date(row.son_gecerlilik.replace(' ', 'T') + 'Z') < new Date()) {
      return res.status(400).json({ error: 'Bağlantının süresi dolmuş.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(String(sifre), salt);

    const tx = db.transaction(() => {
      db.prepare(`UPDATE kullanicilar SET sifre_hash = ?, sifre_degistirilmeli = 0 WHERE id = ?`)
        .run(hash, row.kullanici_id);
      db.prepare(`UPDATE sifre_sifirlama_tokenlari SET kullanildi = 1 WHERE id = ?`).run(row.id);
      // Aynı kullanıcının açıkta kalan diğer tokenlarını da iptal et
      db.prepare(`UPDATE sifre_sifirlama_tokenlari SET kullanildi = 1 WHERE kullanici_id = ? AND kullanildi = 0`)
        .run(row.kullanici_id);
    });
    tx();

    logActivity({
      kullanici_id: row.kullanici_id,
      kullanici_email: row.email,
      kullanici_rol: row.rol_adi,
      yontem: 'POST',
      yol: '/api/auth/reset-password',
      aciklama: 'Şifre self-servis sıfırlama ile yenilendi',
      detay: null,
    });

    // Kullanıcıya bilgilendirme bildirimi
    try {
      db.prepare(`INSERT INTO bildirimler (kullanici_id, baslik, mesaj) VALUES (?, ?, ?)`)
        .run(row.kullanici_id, 'Şifreniz yenilendi', 'Şifreniz başarıyla sıfırlandı. Bu işlemi siz yapmadıysanız derhal IT ile iletişime geçin.');
    } catch (_) {}

    res.json({ message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

/**
 * Giriş yapmış kullanıcının kendi şifresini değiştirmesi.
 * "Zorunlu şifre değiştirme" akışında da kullanılır; bu durumda mevcut şifre
 * geçici şifredir ve başarıyla doğrulanırsa sifre_degistirilmeli = 0 yapılır.
 */
router.post('/change-password', authenticateToken, (req, res) => {
  try {
    const { mevcut_sifre, yeni_sifre } = req.body || {};
    if (!mevcut_sifre || !yeni_sifre) {
      return res.status(400).json({ error: 'Mevcut ve yeni şifre zorunludur.' });
    }
    const pwdCheck = assertPasswordValid(yeni_sifre);
    if (!pwdCheck.ok) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const u = db.prepare(`SELECT id, email, sifre_hash FROM kullanicilar WHERE id = ?`).get(req.user.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    if (!bcrypt.compareSync(String(mevcut_sifre), u.sifre_hash)) {
      return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
    }
    if (bcrypt.compareSync(String(yeni_sifre), u.sifre_hash)) {
      return res.status(400).json({ error: 'Yeni şifre eskisiyle aynı olamaz.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(String(yeni_sifre), salt);
    db.prepare(`UPDATE kullanicilar SET sifre_hash = ?, sifre_degistirilmeli = 0 WHERE id = ?`).run(hash, u.id);

    logActivity({
      kullanici_id: u.id,
      kullanici_email: u.email,
      kullanici_rol: req.user.rol_adi,
      yontem: 'POST',
      yol: '/api/auth/change-password',
      aciklama: 'Kullanıcı şifresini güncelledi',
      detay: null,
    });

    res.json({ message: 'Şifreniz güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

router.post('/register', authenticateToken, authorizeRoles('IT Müdürü'), (req, res) => {
  try {
    const { ad, soyad, email, sifre, departman_id, rol_id } = req.body;

    if (!ad || !soyad || !email || !sifre || !rol_id) {
      return res.status(400).json({ error: 'Tüm zorunlu alanları doldurun.' });
    }

    const pwdCheck = assertPasswordValid(sifre);
    if (!pwdCheck.ok) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const existing = db.prepare('SELECT id FROM kullanicilar WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(sifre, salt);

    // IT tarafından atanan şifre kurumsal güvenlik gereği geçicidir:
    // kullanıcı ilk girişte kendi şifresini belirlemek zorunda kalır.
    const result = db.prepare(`
      INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, departman_id, rol_id, sifre_degistirilmeli)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(ad, soyad, email, hash, departman_id || null, rol_id);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Kullanıcı başarıyla oluşturuldu. Kullanıcı ilk girişte şifresini değiştirmek zorunda kalacak.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT k.id, k.ad, k.soyad, k.email, k.departman_id, k.rol_id, k.aktif, k.sifre_degistirilmeli,
           r.rol_adi AS rol,
           d.departman_adi
    FROM kullanicilar k
    JOIN roller r ON k.rol_id = r.id
    LEFT JOIN departmanlar d ON k.departman_id = d.id
    WHERE k.id = ?
  `).get(req.user.id);

  res.json(user);
});

module.exports = router;
