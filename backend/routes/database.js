/**
 * Sadece IT Müdürü: salt okunur veritabanı keşfi. Tablolar beyaz
 * listeyle sınırlanır; dinamik SQL sadece izin verilen isimlere
 * uygulanır (SQLi riski kapatılır).
 */
const express = require('express');
const { db } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_TABLES = [
  'roller',
  'departmanlar',
  'kullanicilar',
  'donanimlar',
  'yazilim_lisanslari',
  'zimmetler',
  'ariza_talepleri',
  'tedarikciler',
  'satinalma_faturalari',
  'bildirimler',
  'islem_loglari',
];

const TABLE_LABELS = {
  roller: 'Roller',
  departmanlar: 'Departmanlar',
  kullanicilar: 'Kullanıcılar',
  donanimlar: 'Donanımlar',
  yazilim_lisanslari: 'Yazılım Lisansları',
  zimmetler: 'Zimmetler',
  ariza_talepleri: 'Arıza Talepleri',
  tedarikciler: 'Tedarikçiler',
  satinalma_faturalari: 'Satınalma Faturaları',
  bildirimler: 'Bildirimler',
  islem_loglari: 'İşlem Günlüğü',
};

router.use(authenticateToken, authorizeRoles('IT Müdürü'));

router.get('/tables', (req, res) => {
  try {
    const tables = ALLOWED_TABLES.map((name) => {
      const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
      return { name, label: TABLE_LABELS[name] || name, rowCount: count };
    });
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tables/:name', (req, res) => {
  const { name } = req.params;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Geçersiz tablo.' });
  }
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const columns = db.prepare(`PRAGMA table_info(${name})`).all().map((c) => ({
      name: c.name,
      type: c.type,
      notnull: !!c.notnull,
      pk: !!c.pk,
    }));

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM ${name}`).get();

    const rows = db
      .prepare(`SELECT * FROM ${name} ORDER BY rowid DESC LIMIT ? OFFSET ?`)
      .all(limit, offset);

    res.json({ name, label: TABLE_LABELS[name] || name, columns, rows, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const sizeRow = db
      .prepare("SELECT page_count * page_size as bytes FROM pragma_page_count(), pragma_page_size()")
      .get();
    const dbInfo = db.prepare('PRAGMA database_list').all();
    const totals = ALLOWED_TABLES.reduce((acc, name) => {
      acc[name] = db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get().c;
      return acc;
    }, {});
    const totalRows = Object.values(totals).reduce((a, b) => a + b, 0);
    res.json({
      sizeBytes: sizeRow?.bytes || 0,
      totalTables: ALLOWED_TABLES.length,
      totalRows,
      files: dbInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
