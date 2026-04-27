/**
 * Kurumsal şifre politikası.
 *
 * Kurallar:
 *  - En az 8 karakter
 *  - En az bir BÜYÜK harf (A-Z, TR: ÇĞİÖŞÜ)
 *  - En az bir küçük harf (a-z, TR: çğıiöşü)
 *  - En az bir rakam (0-9)
 *  - En az bir özel karakter (!@#$%^&*()_+-=[]{};':"\\|,.<>/?`~)
 *  - Boşluk karakteri içeremez
 *
 * `validatePassword` — hata mesajı dizisi döner (boşsa geçerli).
 * `assertPasswordValid` — uygun değilse { ok: false, error } döner, aksi halde { ok: true }.
 */

const MIN_LENGTH = 8;

const PASSWORD_POLICY_TEXT =
  `Şifre en az ${MIN_LENGTH} karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermelidir.`;

function validatePassword(raw) {
  const errors = [];
  const s = String(raw ?? '');

  if (s.length < MIN_LENGTH) {
    errors.push(`En az ${MIN_LENGTH} karakter olmalı.`);
  }
  if (/\s/.test(s)) {
    errors.push('Boşluk karakteri içeremez.');
  }
  if (!/[A-ZÇĞİÖŞÜ]/.test(s)) {
    errors.push('En az bir büyük harf içermeli.');
  }
  if (!/[a-zçğıiöşü]/.test(s)) {
    errors.push('En az bir küçük harf içermeli.');
  }
  if (!/[0-9]/.test(s)) {
    errors.push('En az bir rakam içermeli.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(s)) {
    errors.push('En az bir özel karakter içermeli (ör. ! @ # $ % & * ?).');
  }
  return errors;
}

function assertPasswordValid(raw) {
  const errs = validatePassword(raw);
  if (errs.length === 0) return { ok: true };
  return { ok: false, error: `Şifre kurallarına uymuyor: ${errs.join(' ')}` };
}

module.exports = {
  MIN_LENGTH,
  PASSWORD_POLICY_TEXT,
  validatePassword,
  assertPasswordValid,
};
