/**
 * `sifre_degistirilmeli` bayrağı: ilk girişte veya IT sıfırlaması sonrası
 * zorunlu parola değişimi; politikaya uymazsa API reddeder.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import PasswordStrength from '../components/PasswordStrength';
import { isPasswordValid } from '../utils/passwordPolicy';
import { HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineLogout, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

/**
 * Kullanıcının sifre_degistirilmeli === 1 olduğunda yönlendirildiği ekran.
 * Mevcut (geçici) şifre + yeni şifre + onay ister; başarıda flag sıfırlanır
 * ve kullanıcı rolüne göre anasayfaya yönlendirilir.
 */
export default function ForceChangePassword() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [yeni2, setYeni2] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMevcut, setShowMevcut] = useState(false);
  const [showYeni, setShowYeni] = useState(false);
  const [showYeni2, setShowYeni2] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid(yeni)) {
      toast.error('Yeni şifre kurumsal şifre kurallarına uymuyor.');
      return;
    }
    if (yeni !== yeni2) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (yeni === mevcut) {
      toast.error('Yeni şifre eskisiyle aynı olamaz.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { mevcut_sifre: mevcut, yeni_sifre: yeni });
      toast.success('Şifreniz güncellendi.');
      // Kullanıcı bilgisini tazele — flag sıfırlanmış olmalı
      try {
        const me = await api.get('/auth/me');
        if (setUser) setUser(me.data);
        localStorage.setItem('user', JSON.stringify({ ...me.data, rol: me.data.rol || me.data.rol_adi }));
      } catch (_) {}
      const rol = user?.rol;
      if (rol === 'Personel') navigate('/varliklarim', { replace: true });
      else if (rol === 'Satınalma') navigate('/lisanslar', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Şifre değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="mx-auto mb-2 flex h-24 w-24 items-center justify-center">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary-800">Şifrenizi Belirleyin</h1>
          <p className="text-brand-ink-muted text-sm mt-1.5 max-w-sm mx-auto">
            Güvenliğiniz için IT tarafından atanan geçici şifrenizi değiştirmeniz gerekiyor.
          </p>
        </div>

        <div className="rounded-2xl shadow-lg border border-primary-100 bg-white p-7">
          <div className="flex items-start gap-2.5 rounded-xl bg-primary-50 border border-primary-100 p-3 text-sm text-primary-800 mb-5">
            <HiOutlineShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
            <p>
              Mevcut şifre olarak IT'den aldığınız <strong>geçici şifreyi</strong> girin, ardından yeni şifrenizi belirleyin.
              Yeni şifrenizi belirlemeden başka bir sayfaya geçemezsiniz.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-ink-muted mb-1.5 uppercase tracking-wider">Mevcut (geçici) şifre</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                <input
                  type={showMevcut ? 'text' : 'password'}
                  value={mevcut}
                  onChange={(e) => setMevcut(e.target.value)}
                  className="input-field pl-11 pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowMevcut((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                  title={showMevcut ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-label={showMevcut ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  tabIndex={-1}
                >
                  {showMevcut ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-ink-muted mb-1.5 uppercase tracking-wider">Yeni şifre</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                <input
                  type={showYeni ? 'text' : 'password'}
                  value={yeni}
                  onChange={(e) => setYeni(e.target.value)}
                  className="input-field pl-11 pr-11"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowYeni((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                  title={showYeni ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-label={showYeni ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  tabIndex={-1}
                >
                  {showYeni ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrength password={yeni} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-ink-muted mb-1.5 uppercase tracking-wider">Yeni şifre (tekrar)</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
                <input
                  type={showYeni2 ? 'text' : 'password'}
                  value={yeni2}
                  onChange={(e) => setYeni2(e.target.value)}
                  className="input-field pl-11 pr-11"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowYeni2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                  title={showYeni2 ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-label={showYeni2 ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  tabIndex={-1}
                >
                  {showYeni2 ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {yeni2.length > 0 && yeni !== yeni2 && (
                <p className="text-xs text-red-500 mt-1">Şifreler eşleşmiyor.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid(yeni) || yeni !== yeni2}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed justify-center"
            >
              {loading ? 'Güncelleniyor...' : 'Şifremi Belirle'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-primary-100 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-brand-ink-muted hover:text-brand-danger transition-colors"
            >
              <HiOutlineLogout className="w-4 h-4" />
              Vazgeç ve çıkış yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
