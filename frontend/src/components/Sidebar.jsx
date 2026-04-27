/**
 * Rol filtreli menü: öğeler `allMenuItems` üzerinden bölümlere
 * ayrılır; mobil `open` durumunda üst üste çizilir, kapatma callback’i
 * bağlanır.
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import {
  HiOutlineDesktopComputer, HiOutlineDocumentText, HiOutlineClipboardList,
  HiOutlineExclamationCircle, HiOutlineUsers, HiOutlineTruck,
  HiOutlineReceiptTax, HiOutlineChartBar, HiOutlineHome,
  HiOutlineOfficeBuilding, HiOutlineX, HiOutlineClipboard, HiOutlineDatabase, HiOutlineCollection
} from 'react-icons/hi';

const allMenuItems = [
  { to: '/', icon: HiOutlineHome, label: 'Ana Sayfa', roles: ['IT Müdürü', 'IT Destek'], section: 'Genel' },
  { to: '/dashboard', icon: HiOutlineChartBar, label: 'Dashboard', roles: ['IT Müdürü'], section: 'Genel' },
  { to: '/varliklarim', icon: HiOutlineClipboard, label: 'Varlıklarım', roles: ['Personel'], section: 'Genel' },

  { to: '/donanimlar', icon: HiOutlineDesktopComputer, label: 'Donanımlar', roles: ['IT Müdürü', 'IT Destek'], section: 'Envanter' },
  { to: '/lisanslar', icon: HiOutlineDocumentText, label: 'Lisanslar', roles: ['IT Müdürü', 'IT Destek', 'Satınalma'], section: 'Envanter' },
  { to: '/zimmetler', icon: HiOutlineClipboardList, label: 'Zimmetler', roles: ['IT Müdürü', 'IT Destek'], section: 'Envanter' },
  { to: '/arizalar', icon: HiOutlineExclamationCircle, label: 'Arıza Talepleri', roles: ['IT Müdürü', 'IT Destek', 'Personel'], section: 'Envanter' },

  { to: '/kullanicilar', icon: HiOutlineUsers, label: 'Kullanıcılar', roles: ['IT Müdürü'], section: 'Yönetim' },
  { to: '/departmanlar', icon: HiOutlineOfficeBuilding, label: 'Departmanlar', roles: ['IT Müdürü'], section: 'Yönetim' },
  { to: '/tedarikciler', icon: HiOutlineTruck, label: 'Tedarikçiler', roles: ['IT Müdürü', 'Satınalma'], section: 'Yönetim' },
  { to: '/faturalar', icon: HiOutlineReceiptTax, label: 'Faturalar', roles: ['IT Müdürü', 'Satınalma'], section: 'Yönetim' },

  { to: '/veritabani', icon: HiOutlineDatabase, label: 'Veritabanı', roles: ['IT Müdürü'], section: 'Sistem' },
  { to: '/islem-loglari', icon: HiOutlineCollection, label: 'İşlem Günlüğü', roles: ['IT Müdürü'], section: 'Sistem' },
];

const rolColors = {
  'IT Müdürü': 'from-primary-600 to-primary-800',
  'IT Destek': 'from-primary-500 to-primary-700',
  'Satınalma': 'from-primary-400 to-primary-600',
  'Personel': 'from-brand-mint to-primary-600',
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.rol));

  const sections = [...new Set(menuItems.map(m => m.section))];

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
      isActive
        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-600/25'
        : 'text-brand-ink-muted hover:bg-primary-50 hover:text-brand-ink'
    }`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-surface-900/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 transform transition-transform duration-300
        md:relative md:translate-x-0 flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-primary-100 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="md" className="scale-[2.2]" />
            <div className="leading-tight min-w-0">
              <p className="font-bold text-brand-ink text-sm truncate">ULVİS</p>
              <p className="text-[10px] text-primary-600/90">Kurumsal Lisans ve Varlık İzleme</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
          {sections.map(section => (
            <div key={section}>
              <h3 className="px-3 mb-2 text-[10px] font-bold text-primary-600/70 uppercase tracking-wider">{section}</h3>
              <div className="space-y-1">
                {menuItems.filter(m => m.section === section).map(item => (
                  <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose} end={item.to === '/'}>
                    {({ isActive }) => (
                      <>
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-primary-400 group-hover:text-primary-600'}`} />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-primary-100 bg-brand-canvas/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-primary-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rolColors[user?.rol] || 'from-gray-500 to-gray-600'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white font-semibold text-sm">
                {user?.ad?.[0]}{user?.soyad?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-ink truncate">{user?.ad} {user?.soyad}</p>
              <p className="text-[11px] text-brand-ink-muted truncate">{user?.rol}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
