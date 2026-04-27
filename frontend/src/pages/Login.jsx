/**
 * Giriş formu: KVKK onayı, “şifremi unuttum” akışı, zorunlu yönlendirme
 * `AuthContext` üzerinden çözümlenir. Demo hızlı giriş kaldırılmıştır.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import BrandLogo from '../components/BrandLogo';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight, HiOutlineShieldCheck, HiX, HiOutlineKey, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [loading, setLoading] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [showKvkkModal, setShowKvkkModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kvkkAccepted) {
      toast.error('Devam etmek için KVKK Aydınlatma Metni\'ni kabul etmelisiniz.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, sifre);
      // Geçici şifre ile giriş yaptıysa zorunlu değişim ekranına
      if (data.user.sifre_degistirilmeli) {
        toast('Güvenliğiniz için yeni bir şifre belirlemeniz gerekiyor.', { icon: '🔐' });
        navigate('/sifre-degistir', { replace: true });
        return;
      }
      toast.success(`Hoş geldiniz, ${data.user.ad}!`);
      if (data.user.rol === 'Personel') navigate('/varliklarim');
      else if (data.user.rol === 'Satınalma') navigate('/lisanslar');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(email.trim() || '');
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const em = forgotEmail.trim();
    if (!em) {
      toast.error('E-posta adresini girin.');
      return;
    }
    setForgotLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: em });
      toast.success(data.message || 'İşlem tamamlandı.');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem gerçekleştirilemedi.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-4 sm:py-6 bg-brand-canvas">
      {/* Dekor katmanları */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-brand-mint/35 to-primary-400/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary-600/12 blur-3xl" />
        <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-brand-mint/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(95vw,560px)] h-[min(95vw,560px)] rounded-full border border-primary-300/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(85vw,480px)] h-[min(85vw,480px)] rounded-full border border-primary-200/10" />
      </div>
      <div
        className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(rgba(0,109,119,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,109,119,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      <div className="relative w-full max-w-[440px] sm:max-w-md animate-slide-up z-10">
        {/* Logo + başlık */}
        <div className="text-center mb-5">
          <div className="relative mx-auto mb-2 flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center">
            <div
              className="pointer-events-none absolute inset-2 rounded-full bg-gradient-to-b from-primary-200/35 via-brand-mint/20 to-transparent blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-center justify-center drop-shadow-[0_8px_30px_rgba(0,109,119,0.18)]">
              <BrandLogo size="xl" className="scale-[2]" />
            </div>
          </div>
          <h1 className="text-[1.75rem] sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent">
            ULVİS
          </h1>
          <p className="text-brand-ink-muted text-sm sm:text-[0.9375rem] mt-1.5 font-medium leading-relaxed max-w-sm mx-auto">
            Kurumsal Lisans ve Varlık İzleme Sistemi
          </p>
        </div>

        <div className="rounded-[1.75rem] shadow-[0_25px_60px_-12px_rgba(0,77,84,0.12),0_12px_24px_-8px_rgba(0,109,119,0.08)] border border-primary-100/90 bg-white/95 backdrop-blur-sm p-8 sm:p-9">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-brand-ink">Hoş Geldiniz</h2>
            <p className="text-sm text-brand-ink-muted mt-1.5">Kurumsal hesabınızla giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-ink-muted mb-1.5 uppercase tracking-wider">E-posta</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="ornek@ulvis.com.tr"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-brand-ink-muted uppercase tracking-wider">Şifre</label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Şifremi Unuttum
                </button>
              </div>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                  title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  tabIndex={-1}
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="kvkk"
                type="checkbox"
                checked={kvkkAccepted}
                onChange={(e) => setKvkkAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-2 focus:ring-primary-300 cursor-pointer accent-primary-600"
              />
              <label htmlFor="kvkk" className="text-xs text-brand-ink-muted leading-relaxed cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setShowKvkkModal(true)}
                  className="text-primary-600 hover:text-primary-700 font-semibold underline underline-offset-2"
                >
                  KVKK Aydınlatma Metni
                </button>
                &apos;ni okudum, kişisel verilerimin işlenmesini kabul ediyorum.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !kvkkAccepted}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed group justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                <>
                  Giriş Yap
                  <HiOutlineArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-brand-ink-muted text-center mt-4">
          © 2026 ULVİS · Kurumsal Lisans ve Varlık İzleme Sistemi
        </p>
      </div>

      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-brand-ink/50 backdrop-blur-sm animate-fade-in"
          onClick={() => !forgotLoading && setShowForgotModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-primary-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100 bg-brand-mint-soft/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
                  <HiOutlineKey className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-ink">Şifremi Unuttum</h3>
                  <p className="text-xs text-brand-ink-muted">Kayıtlı e-posta adresinizi girin</p>
                </div>
              </div>
              <button
                type="button"
                disabled={forgotLoading}
                onClick={() => setShowForgotModal(false)}
                className="w-9 h-9 rounded-lg hover:bg-white/80 flex items-center justify-center text-brand-ink-muted hover:text-brand-ink transition-colors disabled:opacity-50"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
              <p className="text-sm text-brand-ink-muted leading-relaxed">
                Talebiniz IT yönetimine iletilir. IT ekibi size güvenli bir kanaldan <strong>geçici bir şifre</strong>{' '}
                sağlayacaktır. Sisteme girdiğinizde, güvenliğiniz için yeni şifrenizi belirlemeniz istenecektir.
                E-posta sistemi yapılandırılmışsa bilgilendirme ayrıca e-posta ile de gönderilir.
              </p>
              <div>
                <label className="block text-xs font-semibold text-brand-ink-muted mb-1.5 uppercase tracking-wider">E-posta</label>
                <div className="relative">
                  <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="ornek@ulvis.com.tr"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotLoading}
                  className="btn-secondary order-2 sm:order-1"
                >
                  İptal
                </button>
                <button type="submit" disabled={forgotLoading} className="btn-primary order-1 sm:order-2 disabled:opacity-50 justify-center">
                  {forgotLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gönderiliyor...
                    </span>
                  ) : (
                    'Talebi Gönder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKvkkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-brand-ink/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowKvkkModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-primary-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100 bg-brand-mint-soft/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
                  <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-ink">KVKK Aydınlatma Metni</h3>
                  <p className="text-xs text-brand-ink-muted">Kişisel Verilerin Korunması Kanunu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKvkkModal(false)}
                className="w-9 h-9 rounded-lg hover:bg-white/80 flex items-center justify-center text-brand-ink-muted hover:text-brand-ink transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 text-sm text-brand-ink-muted leading-relaxed space-y-4">
              <p>
                6698 sayılı <strong className="text-brand-ink">Kişisel Verilerin Korunması Kanunu</strong> (&quot;KVKK&quot;) uyarınca,
                ULVİS Kurumsal Lisans ve Varlık İzleme Sistemi (&quot;Sistem&quot;) tarafından veri
                sorumlusu sıfatıyla kişisel verilerinizin aşağıda açıklanan kapsamda işleneceğini
                bilgilerinize sunarız.
              </p>

              <div>
                <h4 className="font-bold text-brand-ink mb-1">1. İşlenen Kişisel Veriler</h4>
                <p>
                  Ad-soyad, e-posta adresi, departman bilgisi, zimmetli donanım ve yazılım
                  kayıtları, sisteme giriş/çıkış logları ve IP adresi bilgisi işlenmektedir.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-brand-ink mb-1">2. İşleme Amaçları</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kullanıcı kimlik doğrulama ve yetkilendirme süreçlerinin yürütülmesi</li>
                  <li>Donanım ve yazılım lisans envanterinin takibi</li>
                  <li>Zimmet ve iade süreçlerinin yönetimi</li>
                  <li>Arıza ve destek taleplerinin karşılanması</li>
                  <li>Bilgi güvenliği ve denetim faaliyetleri</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-brand-ink mb-1">3. Hukuki Sebep</h4>
                <p>
                  Kişisel verileriniz; KVKK m.5/2 kapsamında sözleşmenin kurulması ve ifası,
                  hukuki yükümlülüğün yerine getirilmesi ve meşru menfaat hukuki sebeplerine
                  dayalı olarak işlenmektedir.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-brand-ink mb-1">4. Aktarım</h4>
                <p>
                  Kişisel verileriniz, yasal zorunluluklar dışında üçüncü kişilerle
                  paylaşılmamakta olup yalnızca yetkili IT personeli ve yöneticiler tarafından
                  erişilebilmektedir.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-brand-ink mb-1">5. Haklarınız</h4>
                <p>
                  KVKK m.11 kapsamında; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini
                  veya silinmesini talep etme, işlemeye itiraz etme haklarına sahipsiniz.
                  Taleplerinizi <strong className="text-brand-ink">kvkk@ulvis.com.tr</strong> adresine iletebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-primary-100 bg-brand-canvas">
              <button
                type="button"
                onClick={() => setShowKvkkModal(false)}
                className="px-4 py-2 text-sm font-medium text-brand-ink-muted hover:text-brand-ink transition-colors"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  setKvkkAccepted(true);
                  setShowKvkkModal(false);
                }}
                className="btn-primary px-5 py-2 text-sm"
              >
                Okudum, Kabul Ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
