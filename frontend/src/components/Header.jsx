/**
 * Üst şerit: sayfa başlığı yol eşlemesinden, bildirim sayacı API’den,
 * çıkışta `logout` ve yönlendirme kullanılır.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import api from '../services/api';
import { HiOutlineMenu, HiOutlineBell, HiOutlineLogout, HiOutlineSearch } from 'react-icons/hi';

const pageTitles = {
  '/': 'Ana Sayfa',
  '/dashboard': 'Dashboard',
  '/varliklarim': 'Varlıklarım',
  '/donanimlar': 'Donanım Yönetimi',
  '/lisanslar': 'Yazılım Lisansları',
  '/zimmetler': 'Zimmet Yönetimi',
  '/arizalar': 'Arıza Talepleri',
  '/kullanicilar': 'Kullanıcı Yönetimi',
  '/departmanlar': 'Departman Yönetimi',
  '/tedarikciler': 'Tedarikçi Yönetimi',
  '/faturalar': 'Satınalma Faturaları',
  '/bildirimler': 'Bildirimler',
  '/veritabani': 'Veritabanı',
  '/islem-loglari': 'İşlem Günlüğü',
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      api.get('/notifications/unread-count')
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentTitle = pageTitles[location.pathname] || 'ULVİS';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-lg border-b border-primary-100 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="md:hidden text-brand-ink-muted hover:text-brand-ink p-2 rounded-lg hover:bg-primary-50 transition-colors">
          <HiOutlineMenu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block shrink-0">
          <BrandLogo size="sm" className="scale-[2]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-brand-ink truncate">{currentTitle}</h1>
          <p className="text-xs text-brand-ink-muted hidden sm:block">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/bildirimler')}
          className="relative p-2.5 rounded-xl text-brand-ink-muted hover:text-primary-700 hover:bg-primary-50 transition-colors"
          title="Bildirimler"
        >
          <HiOutlineBell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-brand-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="hidden sm:block w-px h-8 bg-primary-200/80 mx-1" />

        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-brand-ink-muted hover:text-brand-danger hover:bg-red-50 transition-colors font-medium text-sm">
          <HiOutlineLogout className="w-5 h-5" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
}
