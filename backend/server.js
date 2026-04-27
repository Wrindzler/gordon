/**
 * ULVİS Express HTTP sunucusunun giriş noktası.
 *
 * JSON gövde ayrıştırması, CORS, API rotalarının bağlanması,
 * periyodik lisans denetimlerinin (cron) ve açılış anı
 * eşzamanı kontrollerinin yürütülmesi bu dosyada toplanır.
 * Ortam değişkenleri dotenv üzerinden yüklenir.
 */
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initializeDatabase } = require('./config/db');
const { checkExpiringLicenses, reactivateRenewedLicenses, updateExpiredLicenses } = require('./services/notificationService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const hardwareRoutes = require('./routes/hardware');
const licenseRoutes = require('./routes/licenses');
const allocationRoutes = require('./routes/allocations');
const ticketRoutes = require('./routes/tickets');
const vendorRoutes = require('./routes/vendors');
const invoiceRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const databaseRoutes = require('./routes/database');
const activityLogRoutes = require('./routes/activityLogs');
const { auditResponseLogger } = require('./middleware/auditLogger');

const app = express();
const PORT = process.env.PORT || 5000;

/* Genel ağaç: CORS ve JSON middleware’i uygulanır; denetim yanıt günlüğü
   tüm isteklere asenkron `finish` dinleyicisiyle takılır. */
app.use(cors());
app.use(express.json());
app.use(auditResponseLogger);

/* SQLite şema: tablolar yoksa oluşturulur, eksik kolon idempotent biçimde eklenir. */
initializeDatabase();

/* REST alt yollar: her kaynak ayrı router modülüne yönlendirilir. */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/activity-logs', activityLogRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/* Zamanlayıcı: her gün 02:00’de yenilenen ve süresi geçen lisanslar
   ayrı ayrı işlenir; ardından yakında bitecek lisanslar için bildirim üretimi tetiklenir. */
cron.schedule('0 2 * * *', () => {
  console.log('[CRON] Lisans kontrolleri çalıştırılıyor...');
  reactivateRenewedLicenses();
  updateExpiredLicenses();
  checkExpiringLicenses();
});

/* Dinleyici: süreç başlar başlamaz aynı lisans eşleme adımları (cron ile tutarlı
   sırada) manuel bekleme olmaksızın bir kez çalıştırılır. */
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  reactivateRenewedLicenses();
  updateExpiredLicenses();
  checkExpiringLicenses();
});
