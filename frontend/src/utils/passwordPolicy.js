/**
 * Kurumsal şifre politikası (backend ile aynı kurallar kopyalanır).
 * Her kural `test` fonksiyonuyla doğrulanır; UI’da satır satır
 * renklendirme için dışa açık listeler kullanılır. Boşluk
 * karakteri açıkça reddedilir.
 */

export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `En az ${PASSWORD_MIN_LENGTH} karakter`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'upper',
    label: 'Büyük harf (A-Z)',
    test: (p) => /[A-ZÇĞİÖŞÜ]/.test(p),
  },
  {
    id: 'lower',
    label: 'Küçük harf (a-z)',
    test: (p) => /[a-zçğıiöşü]/.test(p),
  },
  {
    id: 'digit',
    label: 'Rakam (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Özel karakter (!@#$% vb.)',
    test: (p) => SPECIAL_CHAR_RE.test(p),
  },
  {
    id: 'nospace',
    label: 'Boşluk içermiyor',
    test: (p) => p.length === 0 || !/\s/.test(p),
  },
];

export function evaluatePassword(raw) {
  const p = String(raw ?? '');
  const results = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(p) }));
  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = results.every((r) => r.passed);
  return { results, passedCount, total: PASSWORD_RULES.length, valid: allPassed };
}

export function isPasswordValid(raw) {
  return evaluatePassword(raw).valid;
}
