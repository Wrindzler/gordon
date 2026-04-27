/**
 * Opsiyonel SMTP tabanlı e-posta servisi.
 *
 * .env örneği:
 *   SMTP_HOST=smtp.office365.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false           # 465 için true
 *   SMTP_USER=no-reply@sirket.com
 *   SMTP_PASS=********
 *   SMTP_FROM="ULVİS <no-reply@sirket.com>"
 *   APP_URL=http://localhost:5173
 *
 * SMTP env'leri eksikse transporter oluşturulmaz; fonksiyonlar
 * { sent: false, reason } dönerek sistemi bozmaz.
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
let configError = null;

function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (transporter || configError) return transporter;
  if (!isConfigured()) {
    configError = 'SMTP yapılandırılmamış';
    return null;
  }
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } catch (e) {
    configError = e.message;
    return null;
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    console.log(`[MAIL:skip] SMTP aktif değil (${configError}). To=${to} Subject=${subject}`);
    return { sent: false, reason: configError || 'SMTP yapılandırılmamış' };
  }
  try {
    const info = await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (e) {
    console.error('[MAIL:error]', e.message);
    return { sent: false, reason: e.message };
  }
}

function brandedWrapper(titleHtml, bodyHtml) {
  return `
    <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6f8;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5edf0;">
        <div style="background:linear-gradient(135deg,#006d77,#00a99d);padding:20px 24px;color:#fff;">
          <div style="font-size:20px;font-weight:700;letter-spacing:.5px;">ULVİS</div>
          <div style="opacity:.9;font-size:13px;">Kurumsal Lisans ve Varlık İzleme Sistemi</div>
        </div>
        <div style="padding:24px;color:#1f2937;line-height:1.55;">
          <h2 style="margin:0 0 12px 0;font-size:18px;">${titleHtml}</h2>
          ${bodyHtml}
        </div>
        <div style="padding:14px 24px;background:#f8fafa;color:#6b7280;font-size:12px;border-top:1px solid #eef2f4;">
          Bu e-posta otomatik olarak gönderilmiştir. Yanıtlamayınız.
        </div>
      </div>
    </div>`;
}

async function sendPasswordResetEmail({ user, resetUrl, expiresInMinutes }) {
  const subject = 'Şifre Sıfırlama Talebi';
  const text =
    `Merhaba ${user.ad},\n\n` +
    `ULVİS hesabınız için bir şifre sıfırlama talebi aldık. ` +
    `Aşağıdaki bağlantıyı ${expiresInMinutes} dakika içinde kullanabilirsiniz:\n\n` +
    `${resetUrl}\n\n` +
    `Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`;
  const html = brandedWrapper(
    `Merhaba ${user.ad},`,
    `
      <p>ULVİS hesabınız için bir <strong>şifre sıfırlama</strong> talebi aldık.</p>
      <p>Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz. Bağlantı <strong>${expiresInMinutes} dakika</strong> geçerlidir.</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#006d77;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Şifremi Sıfırla</a>
      </p>
      <p style="font-size:12px;color:#6b7280;">Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:<br/>
      <span style="word-break:break-all;">${resetUrl}</span></p>
      <p style="color:#6b7280;font-size:13px;">Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.</p>
    `
  );
  return sendMail({ to: user.email, subject, text, html });
}

async function sendPasswordChangedByItEmail({ user, temporaryPassword }) {
  const subject = 'Şifreniz IT Tarafından Sıfırlandı';
  const text =
    `Merhaba ${user.ad},\n\n` +
    `Hesabınızın şifresi IT yönetimi tarafından sıfırlandı.\n` +
    `Geçici şifreniz: ${temporaryPassword}\n\n` +
    `Giriş yaptığınızda sistem, güvenliğiniz için yeni bir şifre belirlemenizi isteyecektir.`;
  const html = brandedWrapper(
    `Merhaba ${user.ad},`,
    `
      <p>Hesabınızın şifresi <strong>IT yönetimi</strong> tarafından sıfırlandı.</p>
      <p>Geçici şifreniz:</p>
      <p style="text-align:center;margin:16px 0;">
        <code style="display:inline-block;background:#eef6f7;color:#003d40;padding:10px 16px;border-radius:8px;font-size:16px;letter-spacing:2px;">${temporaryPassword}</code>
      </p>
      <p>Bu şifreyle giriş yaptığınızda sistem, güvenliğiniz için yeni bir şifre belirlemenizi isteyecektir.</p>
    `
  );
  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  isConfigured,
  sendMail,
  sendPasswordResetEmail,
  sendPasswordChangedByItEmail,
};
