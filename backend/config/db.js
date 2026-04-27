/**
 * Veritabanı örneğinin (better-sqlite3) oluşturulması, WAL ve FK modlarının
 * etkinleştirilmesi ve ilk kurulum / migrasyon uygulamaları bu modülde
 * toplanır. `DB_PATH` ortam değişkeniyle dosya yolu yönetilir.
 */
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database.sqlite');
const db = new Database(dbPath);

/* Eşzamanlı yazma verimliliği ve bütünlük: WAL ve yabancı anahtar zorunluluğu. */
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Şema: tablolar yoksa IF NOT EXISTS ile yaratılır; indeksler tekrar
 * yürütmede hata vermez. `kullanicilar` için sütun ekleme idempotent
 * PRAGMA table_info üzerinden koşullu yürütülür.
 */
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roller (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rol_adi TEXT NOT NULL UNIQUE
    );
    /* Referans: roller, departmanlar, kullanicilar ağacı */
    CREATE TABLE IF NOT EXISTS departmanlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      departman_adi TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      sifre_hash TEXT NOT NULL,
      departman_id INTEGER,
      rol_id INTEGER NOT NULL,
      aktif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (departman_id) REFERENCES departmanlar(id),
      FOREIGN KEY (rol_id) REFERENCES roller(id)
    );

    /* Envanter: donanım satırları */
    CREATE TABLE IF NOT EXISTS donanimlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seri_no TEXT NOT NULL UNIQUE,
      marka TEXT NOT NULL,
      model TEXT NOT NULL,
      alim_tarihi TEXT,
      durum TEXT DEFAULT 'Müsait' CHECK(durum IN ('Müsait','Kullanımda','Arızalı','Pasif')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* Lisans satırları; durum değerleri cron ile senkronize edilebilir */
    CREATE TABLE IF NOT EXISTS yazilim_lisanslari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      yazilim_adi TEXT NOT NULL,
      lisans_anahtari TEXT,
      baslangic_tarihi TEXT,
      bitis_tarihi TEXT,
      maliyet REAL DEFAULT 0,
      durum TEXT DEFAULT 'Aktif' CHECK(durum IN ('Aktif','Süresi Dolmuş','Pasif')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* Zimmet: donanım veya yazılım varlığının kullanıcıya atanması */
    CREATE TABLE IF NOT EXISTS zimmetler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER NOT NULL,
      varlik_tipi TEXT NOT NULL CHECK(varlik_tipi IN ('Donanım','Yazılım')),
      varlik_id INTEGER NOT NULL,
      zimmet_tarihi TEXT DEFAULT (date('now')),
      iade_tarihi TEXT,
      onay_durumu TEXT DEFAULT 'Onay Bekliyor' CHECK(onay_durumu IN ('Onay Bekliyor','Onaylandı','Reddedildi','İade Edildi')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
    );

    /* Destek: zimmetli donanıma bağlı arıza kayıtları */
    CREATE TABLE IF NOT EXISTS ariza_talepleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER NOT NULL,
      donanim_id INTEGER NOT NULL,
      sorun_aciklamasi TEXT NOT NULL,
      talep_tarihi TEXT DEFAULT (date('now')),
      cozum_tarihi TEXT,
      durum TEXT DEFAULT 'Açık' CHECK(durum IN ('Açık','İşlemde','Beklemede','Çözüldü')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id),
      FOREIGN KEY (donanim_id) REFERENCES donanimlar(id)
    );

    /* Satınalma tarafı: tedarikçi ve fatura */
    CREATE TABLE IF NOT EXISTS tedarikciler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firma_adi TEXT NOT NULL,
      iletisim_bilgisi TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS satinalma_faturalari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tedarikci_id INTEGER NOT NULL,
      toplam_tutar REAL NOT NULL,
      fatura_tarihi TEXT NOT NULL,
      aciklama TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tedarikci_id) REFERENCES tedarikciler(id)
    );

    /* Uygulama içi bildirim inbox’u */
    CREATE TABLE IF NOT EXISTS bildirimler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER NOT NULL,
      baslik TEXT NOT NULL,
      mesaj TEXT NOT NULL,
      okundu INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
    );

    /* Denetim: API üzerinden yapılan işlemlerin izi */
    CREATE TABLE IF NOT EXISTS islem_loglari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER,
      kullanici_email TEXT,
      kullanici_rol TEXT,
      yontem TEXT NOT NULL,
      yol TEXT NOT NULL,
      aciklama TEXT NOT NULL,
      detay TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
    );

    CREATE INDEX IF NOT EXISTS idx_islem_loglari_created ON islem_loglari(created_at DESC);

    /* Self-servis şifre sıfırlama: hash’lenmiş tek kullanımlık belirteçler */
    CREATE TABLE IF NOT EXISTS sifre_sifirlama_tokenlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      son_gecerlilik TEXT NOT NULL,
      kullanildi INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sifre_token_hash ON sifre_sifirlama_tokenlari(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sifre_token_kullanici ON sifre_sifirlama_tokenlari(kullanici_id);
  `);

  // kullanicilar tablosuna sifre_degistirilmeli kolonunu idempotent ekle
  const cols = db.prepare(`PRAGMA table_info(kullanicilar)`).all();
  const hasMustChange = cols.some((c) => c.name === 'sifre_degistirilmeli');
  if (!hasMustChange) {
    db.exec(`ALTER TABLE kullanicilar ADD COLUMN sifre_degistirilmeli INTEGER DEFAULT 0`);
  }
}

module.exports = { db, initializeDatabase };
