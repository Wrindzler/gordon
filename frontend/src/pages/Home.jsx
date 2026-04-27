/**
 * Rol bazlı kısa özet: IT için özet metrikler ve hızlı kısayollar
 * doldurulur; diğer roller yönlendirme ile ayrı sayfalara iter.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineDesktopComputer, HiOutlineDocumentText, HiOutlineClipboardList,
  HiOutlineExclamationCircle, HiOutlineUsers, HiOutlineClock,
  HiOutlineArrowRight,
} from 'react-icons/hi';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    api.get('/dashboard/summary').then(res => setSummary(res.data)).catch(() => {});
    api.get('/tickets').then(res => setRecentTickets(res.data.slice(0, 5))).catch(() => {});
  }, []);

  const cards = summary ? [
    { label: 'Toplam Donanım', value: summary.toplam_donanim, icon: HiOutlineDesktopComputer, gradient: 'from-blue-500 to-cyan-500', link: '/donanimlar' },
    { label: 'Toplam Lisans', value: summary.toplam_lisans, icon: HiOutlineDocumentText, gradient: 'from-emerald-500 to-teal-500', link: '/lisanslar' },
    { label: 'Aktif Zimmetler', value: summary.aktif_zimmetler, icon: HiOutlineClipboardList, gradient: 'from-purple-500 to-pink-500', link: '/zimmetler' },
    { label: 'Açık Talepler', value: summary.acik_talepler, icon: HiOutlineExclamationCircle, gradient: 'from-amber-500 to-orange-500', link: '/arizalar' },
    { label: 'Bu Ay Biten Lisanslar', value: summary.bu_ay_biten_lisanslar, icon: HiOutlineClock, gradient: 'from-red-500 to-rose-500', link: '/lisanslar' },
    { label: 'Toplam Kullanıcı', value: summary.toplam_kullanici, icon: HiOutlineUsers, gradient: 'from-indigo-500 to-violet-500', link: '/kullanicilar' },
  ] : [];

  const statusColors = {
    'Açık': 'bg-red-100 text-red-700',
    'İşlemde': 'bg-amber-100 text-amber-700',
    'Beklemede': 'bg-blue-100 text-blue-700',
    'Çözüldü': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 text-white shadow-xl shadow-primary-500/20">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-primary-100 text-sm font-medium mb-2">Hoş Geldiniz</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user?.ad} {user?.soyad}</h1>
          <p className="text-primary-100/90 mt-2 max-w-xl">
            IT varlıkları ve yazılım lisanslarınızı yönetmek için tek platform. Bugün ne yapmak istersiniz?
          </p>
        </div>
      </div>

      {/* Stat cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => navigate(card.link)}
              className="stat-card card-hover text-left group"
            >
              <div className="flex items-start justify-between">
                <div className={`bg-gradient-to-br ${card.gradient} w-12 h-12 rounded-2xl flex items-center justify-center shadow-md`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-surface-300 group-hover:text-surface-600 transition-all group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-surface-800">{card.value}</p>
                <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent tickets */}
      {recentTickets.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-surface-800">Son Arıza Talepleri</h2>
              <p className="text-sm text-surface-500">En yeni 5 talep</p>
            </div>
            <button onClick={() => navigate('/arizalar')} className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
              Tümünü Gör <HiOutlineArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {recentTickets.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HiOutlineExclamationCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{t.ad} {t.soyad} - {t.marka} {t.model}</p>
                  <p className="text-xs text-surface-500 truncate">{t.sorun_aciklamasi}</p>
                </div>
                <span className={`badge ${statusColors[t.durum]} flex-shrink-0`}>{t.durum}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
