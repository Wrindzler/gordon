/**
 * Geliştirme / demo: şema yaratıldıktan sonra mevcut satırlar
 * boşaltılır; roller, departmanlar, kullanıcılar, örnek varlık ve
 * lisans verisi deterministik biçimde doldurulur.
 */
const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./config/db');

initializeDatabase();

const salt = bcrypt.genSaltSync(10);

// Roller
db.prepare('DELETE FROM islem_loglari').run();
db.prepare('DELETE FROM bildirimler').run();
db.prepare('DELETE FROM satinalma_faturalari').run();
db.prepare('DELETE FROM ariza_talepleri').run();
db.prepare('DELETE FROM zimmetler').run();
db.prepare('DELETE FROM yazilim_lisanslari').run();
db.prepare('DELETE FROM donanimlar').run();
db.prepare('DELETE FROM tedarikciler').run();
db.prepare('DELETE FROM kullanicilar').run();
db.prepare('DELETE FROM departmanlar').run();
db.prepare('DELETE FROM roller').run();

// Reset autoincrement
db.prepare("DELETE FROM sqlite_sequence").run();

console.log('Mevcut veriler temizlendi.');

// Roller
const insertRole = db.prepare('INSERT INTO roller (rol_adi) VALUES (?)');
insertRole.run('Personel');
insertRole.run('IT Destek');
insertRole.run('Satınalma');
insertRole.run('IT Müdürü');
console.log('Roller oluşturuldu.');

// Departmanlar
const insertDept = db.prepare('INSERT INTO departmanlar (departman_adi) VALUES (?)');
const depts = [
  'Yazılım Geliştirme', 'Ar-Ge', 'Pazarlama',
  'Satış', 'İnsan Kaynakları', 'Bilgi İşlem', 'Muhasebe', 'Genel Müdürlük'
];
depts.forEach(d => insertDept.run(d));
console.log('Departmanlar oluşturuldu.');

// Kullanıcılar
const insertUser = db.prepare(`
  INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, departman_id, rol_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// IT Müdürü (Admin)
insertUser.run('Ahmet', 'Yılmaz', 'admin@ulvis.com.tr', bcrypt.hashSync('admin123', salt), 6, 4);

// IT Destek
insertUser.run('Mehmet', 'Kaya', 'itdestek@ulvis.com.tr', bcrypt.hashSync('destek123', salt), 6, 2);
insertUser.run('Ayşe', 'Demir', 'ayse.demir@ulvis.com.tr', bcrypt.hashSync('destek123', salt), 6, 2);

// Satınalma
insertUser.run('Fatma', 'Şahin', 'satinalma@ulvis.com.tr', bcrypt.hashSync('satin123', salt), 6, 3);

// Çalışanlar
insertUser.run('Ali', 'Öztürk', 'ali.ozturk@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 1, 1);
insertUser.run('Zeynep', 'Arslan', 'zeynep.arslan@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 2, 1);
insertUser.run('Hasan', 'Çelik', 'hasan.celik@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 3, 1);
insertUser.run('Elif', 'Koç', 'elif.koc@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 4, 1);
insertUser.run('Burak', 'Aydın', 'burak.aydin@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 5, 1);
insertUser.run('Selin', 'Yıldız', 'selin.yildiz@ulvis.com.tr', bcrypt.hashSync('personel123', salt), 1, 1);
console.log('Kullanıcılar oluşturuldu.');

// Donanımlar
const insertHw = db.prepare(`
  INSERT INTO donanimlar (seri_no, marka, model, alim_tarihi, durum)
  VALUES (?, ?, ?, ?, ?)
`);
const hardwareData = [
  ['SN-001', 'Dell', 'Latitude 5540', '2024-09-15', 'Müsait'],
  ['SN-002', 'HP', 'ProBook 450 G10', '2024-10-01', 'Müsait'],
  ['SN-003', 'Lenovo', 'ThinkPad T14s', '2024-08-20', 'Kullanımda'],
  ['SN-004', 'Dell', 'OptiPlex 7010', '2024-07-10', 'Kullanımda'],
  ['SN-005', 'Apple', 'MacBook Pro 14"', '2025-01-15', 'Müsait'],
  ['SN-006', 'HP', 'EliteDesk 800 G9', '2024-06-01', 'Arızalı'],
  ['SN-007', 'Lenovo', 'ThinkCentre M70q', '2024-11-20', 'Müsait'],
  ['SN-008', 'Dell', 'PowerEdge R750', '2024-03-10', 'Kullanımda'],
  ['SN-009', 'HP', 'ProLiant DL380', '2024-05-22', 'Müsait'],
  ['SN-010', 'Lenovo', 'ThinkPad X1 Carbon', '2025-02-01', 'Kullanımda'],
  ['SN-011', 'Dell', 'Latitude 7440', '2025-03-10', 'Müsait'],
  ['SN-012', 'HP', 'ZBook Fury 16 G10', '2024-12-15', 'Müsait'],
  ['SN-013', 'Lenovo', 'IdeaCentre 5', '2024-04-20', 'Kullanımda'],
  ['SN-014', 'Dell', 'Precision 5680', '2025-01-05', 'Müsait'],
  ['SN-015', 'Apple', 'iMac 24"', '2025-02-20', 'Müsait'],
];
hardwareData.forEach(h => insertHw.run(...h));
console.log('Donanımlar oluşturuldu.');

// Yazılım Lisansları
const insertLic = db.prepare(`
  INSERT INTO yazilim_lisanslari (yazilim_adi, lisans_anahtari, baslangic_tarihi, bitis_tarihi, maliyet, durum)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const licenseData = [
  ['Microsoft Office 365', 'MS365-CORP-001', '2025-01-01', fmt(addDays(today, 30)), 45000, 'Aktif'],
  ['Adobe Creative Cloud', 'ADOBE-CC-002', '2025-03-01', fmt(addDays(today, 15)), 32000, 'Aktif'],
  ['MATLAB R2025a', 'MAT-2025-003', '2025-02-01', fmt(addDays(today, 45)), 28000, 'Aktif'],
  ['AutoCAD 2025', 'ACAD-2025-004', '2025-01-15', fmt(addDays(today, 7)), 18000, 'Aktif'],
  ['VMware vSphere', 'VMW-ENT-005', '2024-06-01', fmt(addDays(today, 75)), 55000, 'Aktif'],
  ['Kaspersky Endpoint', 'KAS-EP-006', '2025-01-01', fmt(addDays(today, 60)), 12000, 'Aktif'],
  ['Microsoft Windows Server', 'WIN-SRV-007', '2024-01-01', fmt(addDays(today, 180)), 35000, 'Aktif'],
  ['JetBrains All Products', 'JB-ALL-008', '2025-04-01', fmt(addDays(today, 15)), 8500, 'Aktif'],
  ['Zoom Business', 'ZOOM-BIZ-009', '2025-02-01', fmt(addDays(today, 90)), 15000, 'Aktif'],
  ['SolidWorks 2025', 'SW-2025-010', '2025-03-01', fmt(addDays(today, 30)), 42000, 'Aktif'],
];
licenseData.forEach(l => insertLic.run(...l));
console.log('Yazılım lisansları oluşturuldu.');

// Zimmetler
const insertAlloc = db.prepare(`
  INSERT INTO zimmetler (kullanici_id, varlik_tipi, varlik_id, zimmet_tarihi, onay_durumu)
  VALUES (?, ?, ?, ?, ?)
`);
insertAlloc.run(5, 'Donanım', 3, '2024-09-01', 'Onaylandı');
insertAlloc.run(5, 'Yazılım', 1, '2025-01-15', 'Onaylandı');
insertAlloc.run(6, 'Donanım', 4, '2024-08-01', 'Onaylandı');
insertAlloc.run(7, 'Donanım', 8, '2024-04-01', 'Onaylandı');
insertAlloc.run(8, 'Donanım', 10, '2025-02-10', 'Onaylandı');
insertAlloc.run(9, 'Donanım', 13, '2024-05-01', 'Onaylandı');
insertAlloc.run(6, 'Yazılım', 3, '2025-02-15', 'Onaylandı');
insertAlloc.run(10, 'Donanım', 1, '2025-03-01', 'Onay Bekliyor');
console.log('Zimmetler oluşturuldu.');

// Arıza Talepleri
const insertTicket = db.prepare(`
  INSERT INTO ariza_talepleri (kullanici_id, donanim_id, sorun_aciklamasi, talep_tarihi, durum)
  VALUES (?, ?, ?, ?, ?)
`);
insertTicket.run(5, 3, 'Laptop ekranında titreme sorunu var. Görüntü zaman zaman kesiliyor.', '2026-04-10', 'İşlemde');
insertTicket.run(7, 8, 'Sunucu fan sesi aşırı yüksek, soğutma sistemi kontrol edilmeli.', '2026-04-05', 'Açık');
insertTicket.run(6, 4, 'Bilgisayar açılırken mavi ekran hatası veriyor. Error code: 0x0000007E', '2026-03-28', 'Çözüldü');
console.log('Arıza talepleri oluşturuldu.');

// Tedarikçiler
const insertVendor = db.prepare('INSERT INTO tedarikciler (firma_adi, iletisim_bilgisi) VALUES (?, ?)');
insertVendor.run('TeknoSoft A.Ş.', 'info@teknosoft.com.tr - 0262 555 1234');
insertVendor.run('BilgiSistem Ltd.', 'satis@bilgisistem.com - 0212 444 5678');
insertVendor.run('MegaByte Bilişim', 'iletisim@megabyte.com.tr - 0216 333 9012');
insertVendor.run('DigiTech Solutions', 'contact@digitech.com.tr - 0312 222 3456');
console.log('Tedarikçiler oluşturuldu.');

// Faturalar
const insertInvoice = db.prepare(`
  INSERT INTO satinalma_faturalari (tedarikci_id, toplam_tutar, fatura_tarihi, aciklama)
  VALUES (?, ?, ?, ?)
`);
insertInvoice.run(1, 135000, '2025-01-10', '15 adet Dell Latitude 5540 dizüstü bilgisayar alımı');
insertInvoice.run(2, 45000, '2025-01-05', 'Microsoft Office 365 yıllık lisans yenileme');
insertInvoice.run(3, 28000, '2025-02-01', 'MATLAB R2025a kurumsal lisans');
insertInvoice.run(1, 55000, '2024-06-01', 'VMware vSphere Enterprise lisans alımı');
insertInvoice.run(4, 42000, '2025-03-01', 'SolidWorks 2025 lisans alımı');
console.log('Faturalar oluşturuldu.');

// Bildirimler (örnek, lisans dışı)
const insertNotif = db.prepare(`
  INSERT INTO bildirimler (kullanici_id, baslik, mesaj) VALUES (?, ?, ?)
`);
insertNotif.run(1, 'Yeni Arıza Talebi', 'Yeni bir arıza talebi oluşturuldu: Laptop ekranında titreme sorunu var.');
insertNotif.run(5, 'Arıza Talebi Güncellendi', 'Arıza talebinizin durumu "İşlemde" olarak güncellendi.');
console.log('Örnek bildirimler oluşturuldu.');

// FG-8: Lisans bitiş bildirimleri (30/15/7 gün) - Satınalma + IT Müdürüne ayrı ayrı
const { checkExpiringLicenses, updateExpiredLicenses } = require('./services/notificationService');
updateExpiredLicenses();
const stats = checkExpiringLicenses();
console.log(`Lisans bitiş bildirimleri üretildi (${stats.totalCreated} kayıt).`);

console.log('\n=== Seed işlemi tamamlandı! ===');
console.log('\nGiriş bilgileri:');
console.log('IT Müdürü  -> admin@ulvis.com.tr / admin123');
console.log('IT Destek  -> itdestek@ulvis.com.tr / destek123');
console.log('Satınalma  -> satinalma@ulvis.com.tr / satin123');
console.log('Personel   -> ali.ozturk@ulvis.com.tr / personel123');

process.exit(0);
