/**
 * KVKK/çerez bandı: yerel depolamada tercih saklanır; login dışı
 * sayfalarda gösterim ve isteğe bağlı analitik/pazarlama anahtarları
 * yönetilir.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HiOutlineCake, HiX, HiOutlineAdjustments, HiCheck } from 'react-icons/hi';

const STORAGE_KEY = 'ulvis_cookie_consent';

export default function CookieConsent() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Giriş ekranında her zaman tekrar göster (kullanıcı değişebilir,
    // her oturum açılışında KVKK/çerez bildirimi tekrar sunulsun).
    if (location.pathname === '/login') {
      setShowSettings(false);
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
      setVisible(false);
    } catch {
      setVisible(true);
    }
  }, [location.pathname]);

  const save = (value) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...value, savedAt: new Date().toISOString() })
      );
    } catch {}
    setVisible(false);
    setShowSettings(false);
  };

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false });
  const saveSelection = () => save(prefs);

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[60] animate-slide-up max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-xl shadow-black/20 border border-surface-200/70 ring-1 ring-black/5">
          <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-sm">
            <HiOutlineCake className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-surface-700 hidden sm:inline">
            Çerezleri kullanıyoruz
          </span>
          <span className="text-xs font-medium text-surface-700 sm:hidden">Çerezler</span>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Çerez ayarları"
            title="Ayarlar"
            className="shrink-0 w-7 h-7 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-surface-800 transition-colors"
          >
            <HiOutlineAdjustments className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={acceptAll}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-700 hover:shadow-md hover:shadow-primary-500/40 transition-all active:scale-[0.97]"
          >
            <HiCheck className="w-3.5 h-3.5" />
            Kabul Et
          </button>

          <button
            type="button"
            onClick={rejectAll}
            aria-label="Reddet"
            title="Reddet"
            className="shrink-0 w-7 h-7 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-400 hover:text-surface-700 transition-colors"
          >
            <HiX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-0 sm:px-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                  <HiOutlineAdjustments className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-800">Çerez Tercihleri</h3>
                  <p className="text-xs text-surface-500">Hangi çerezlere izin verdiğinizi seçin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-9 h-9 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-surface-700 transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <CookieRow
                title="Zorunlu Çerezler"
                desc="Oturum açma, kimlik doğrulama ve güvenlik için gereklidir. Devre dışı bırakılamaz."
                checked
                disabled
              />
              <CookieRow
                title="Analitik Çerezler"
                desc="Sistemin nasıl kullanıldığını anlamamıza ve iyileştirmemize yardımcı olur."
                checked={prefs.analytics}
                onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
              <CookieRow
                title="Pazarlama Çerezleri"
                desc="İlgi alanlarınıza göre içerik ve kampanya önerilerini kişiselleştirir."
                checked={prefs.marketing}
                onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50">
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-800 transition-colors"
              >
                Tümünü Reddet
              </button>
              <button
                type="button"
                onClick={saveSelection}
                className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-500 to-primary-700 hover:shadow-lg hover:shadow-primary-500/40 transition-all active:scale-[0.98]"
              >
                Seçimi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CookieRow({ title, desc, checked, onChange, disabled }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${disabled ? 'bg-surface-50 border-surface-100' : 'border-surface-200 hover:border-primary-300 hover:bg-primary-50/30'}`}>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-surface-800">{title}</h4>
        <p className="text-xs text-surface-500 leading-relaxed mt-0.5">{desc}</p>
      </div>
      <label className={`relative inline-flex items-center shrink-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 rounded-full transition-colors ${disabled ? 'bg-primary-300' : checked ? 'bg-primary-600' : 'bg-surface-300'} peer-focus:ring-2 peer-focus:ring-primary-300`} />
        <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </label>
    </div>
  );
}
