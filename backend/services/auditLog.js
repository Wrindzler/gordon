/**
 * `islem_loglari` tablosuna yazan denetim katmanı. İstek gövdeleri
 * hassas alanlardan arındırılır; yol+metoda göre Türkçe kısa açıklama
 * üretilir. Middleware, başarılı yanıtların `logFromRequest` ile
 * işlenmesinde kullanılır.
 */
const { db } = require('../config/db');

const insertStmt = db.prepare(`
  INSERT INTO islem_loglari (kullanici_id, kullanici_email, kullanici_rol, yontem, yol, aciklama, detay)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

/* PII/secret: parola, hash ve belirteç alanları maskelenir; JSON kısaltılır. */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const o = { ...body };
  ['sifre', 'password', 'sifre_hash', 'token'].forEach((k) => {
    if (k in o) o[k] = o[k] ? '***' : o[k];
  });
  try {
    const s = JSON.stringify(o);
    return s.length > 1500 ? s.slice(0, 1500) + '…' : s;
  } catch {
    return null;
  }
}

/**
 * Açıklama: uç+metoda özel anlamlı cümle ve opsiyonel detay; tanınmayanlarda genel dize.
 */
function describeRequest(req) {
  const method = req.method;
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const body = req.body;
  const pid = req.params?.id || req.params?.name;

  const base = { yontem: method, yol: path };

  if (path.includes('/auth/register')) {
    return { ...base, aciklama: 'Yeni kullanıcı hesabı oluşturuldu', detay: sanitizeBody(body) };
  }
  if (path.includes('/users/') && path.endsWith('/reset-password') && method === 'POST') {
    return { ...base, aciklama: `Kullanıcı şifresi IT tarafından sıfırlandı (ID: ${pid})`, detay: null };
  }
  if (path.includes('/users/') && method === 'PUT') {
    return { ...base, aciklama: `Kullanıcı bilgileri güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
  }
  if (path.includes('/users/') && method === 'DELETE') {
    return { ...base, aciklama: `Kullanıcı pasife alındı (ID: ${pid})`, detay: null };
  }
  if (path === '/api/auth/change-password' && method === 'POST') {
    return { ...base, aciklama: 'Kullanıcı kendi şifresini güncelledi', detay: null };
  }
  if (path === '/api/auth/forgot-password' && method === 'POST') {
    return { ...base, aciklama: 'Şifre sıfırlama talebi gönderildi', detay: sanitizeBody(body) };
  }
  if (path === '/api/auth/reset-password' && method === 'POST') {
    return { ...base, aciklama: 'Şifre self-servis sıfırlama ile yenilendi', detay: null };
  }
  if (path.includes('/departments')) {
    if (method === 'POST') return { ...base, aciklama: 'Yeni departman eklendi', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Departman güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (method === 'DELETE') return { ...base, aciklama: `Departman silindi (ID: ${pid})`, detay: null };
  }
  if (path.includes('/hardware')) {
    if (method === 'POST') return { ...base, aciklama: 'Donanım kaydı eklendi', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Donanım güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (method === 'DELETE') return { ...base, aciklama: `Donanım silindi (ID: ${pid})`, detay: null };
  }
  if (path.includes('/licenses')) {
    if (method === 'POST') return { ...base, aciklama: 'Yazılım lisansı eklendi', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Lisans güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (method === 'DELETE') return { ...base, aciklama: `Lisans silindi (ID: ${pid})`, detay: null };
  }
  if (path.includes('/allocations')) {
    if (method === 'POST') return { ...base, aciklama: 'Zimmet talebi oluşturuldu', detay: sanitizeBody(body) };
    if (path.includes('/onayla')) return { ...base, aciklama: `Zimmet onaylandı (ID: ${pid})`, detay: null };
    if (path.includes('/reddet')) return { ...base, aciklama: `Zimmet reddedildi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (path.includes('/iade')) return { ...base, aciklama: `Zimmet iade edildi (ID: ${pid})`, detay: sanitizeBody(body) };
  }
  if (path.includes('/tickets')) {
    if (method === 'POST') return { ...base, aciklama: 'Arıza talebi oluşturuldu', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Arıza talebi güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
  }
  if (path.includes('/vendors')) {
    if (method === 'POST') return { ...base, aciklama: 'Tedarikçi eklendi', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Tedarikçi güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (method === 'DELETE') return { ...base, aciklama: `Tedarikçi silindi (ID: ${pid})`, detay: null };
  }
  if (path.includes('/invoices')) {
    if (method === 'POST') return { ...base, aciklama: 'Fatura kaydı eklendi', detay: sanitizeBody(body) };
    if (method === 'PUT') return { ...base, aciklama: `Fatura güncellendi (ID: ${pid})`, detay: sanitizeBody(body) };
    if (method === 'DELETE') return { ...base, aciklama: `Fatura silindi (ID: ${pid})`, detay: null };
  }
  if (path.includes('/notifications')) {
    if (path.includes('/check-expiring')) return { ...base, aciklama: 'Lisans bitiş kontrolü manuel tetiklendi', detay: null };
    if (path.includes('/read-all')) return { ...base, aciklama: 'Tüm bildirimler okundu işaretlendi', detay: null };
    if (method === 'PUT' && /\/notifications\/\d+\/read/.test(path)) {
      return { ...base, aciklama: `Bildirim okundu işaretlendi (ID: ${pid})`, detay: null };
    }
  }
  if (path.startsWith('/api/database')) {
    if (method === 'GET' && path.includes('/tables/')) {
      return { ...base, aciklama: `Veritabanı tablosu görüntülendi: ${pid || 'liste'}`, detay: null };
    }
    if (method === 'GET' && path.endsWith('/tables')) {
      return { ...base, aciklama: 'Veritabanı tablo listesi görüntülendi', detay: null };
    }
    if (path.includes('/stats')) {
      return { ...base, aciklama: 'Veritabanı istatistikleri görüntülendi', detay: null };
    }
  }

  return {
    ...base,
    aciklama: `${method} ${path}`,
    detay: ['POST', 'PUT', 'PATCH'].includes(method) ? sanitizeBody(body) : null,
  };
}

/* Yazma: eşiğe kadar kısaltma ile `islem_loglari`’na eklenir. */
function logActivity({ kullanici_id, kullanici_email, kullanici_rol, yontem, yol, aciklama, detay }) {
  try {
    insertStmt.run(
      kullanici_id ?? null,
      kullanici_email ?? null,
      kullanici_rol ?? null,
      yontem,
      yol,
      aciklama,
      detay != null ? String(detay).slice(0, 2000) : null
    );
  } catch (e) {
    console.error('[AUDIT]', e.message);
  }
}

/**
 * Filtre: 2xx dışı, sağlık ve sessiz eklentiler, login ve anonim atlanır;
 * mutasyonda veya onaylanmış veritabanı gezgininde `req.user` ile loglanır.
 */
function logFromRequest(req, resStatusCode) {
  if (resStatusCode < 200 || resStatusCode >= 300) return;

  const path = (req.originalUrl || '').split('?')[0];
  const method = req.method;

  if (
    path === '/api/auth/me' ||
    path === '/api/health' ||
    path === '/api/notifications/unread-count' ||
    path.startsWith('/api/activity-logs')
  ) {
    return;
  }

  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  const isDbRead = method === 'GET' && path.startsWith('/api/database');
  if (!isMutating && !isDbRead) return;

  if (path === '/api/auth/login' || path.startsWith('/api/auth/login')) return;

  if (!req.user) return;

  const rol = req.user.rol_adi || req.user.rol;
  const { aciklama, detay, yontem, yol } = describeRequest(req);

  logActivity({
    kullanici_id: req.user.id,
    kullanici_email: req.user.email,
    kullanici_rol: rol,
    yontem,
    yol: yol || path,
    aciklama,
    detay,
  });
}

module.exports = { logActivity, logFromRequest, describeRequest, sanitizeBody };
