/**
 * JWT tabanlı kimlik doğrulama ve rolbaz rol yetkisi.
 *
 * `Authorization: Bearer` başlığı çözümlenir, kullanıcı veritabanında
 * aktif mi diye sorgulanır; başarıda `req.user` doldurulur. Rol listesi
 * verildiğinde `authorizeRoles` fabrika ile ara katman yaratılır.
 */
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
require('dotenv').config();

/* İstek: token doğrulanır, kullanıcı yüklenir, sonraki aşamaya bırakılır. */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Erişim reddedildi. Token bulunamadı.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare(`
      SELECT k.id, k.ad, k.soyad, k.email, k.departman_id, k.rol_id, k.aktif, r.rol_adi
      FROM kullanicilar k
      JOIN roller r ON k.rol_id = r.id
      WHERE k.id = ?
    `).get(decoded.userId);

    if (!user || !user.aktif) {
      return res.status(401).json({ error: 'Geçersiz veya pasif kullanıcı.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

/* Kısıtlama: yalnızca verilen `rol_adi` değerlerinden biri eşleşirse
   ileri gidilir; aksi 403 yanıtı üretilir. */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol_adi)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
