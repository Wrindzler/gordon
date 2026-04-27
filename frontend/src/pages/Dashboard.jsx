/**
 * IT Müdürü panosu: özet, grafikler (Recharts), bitişe göre lisans
 * kovaları; `/api/dashboard` toplu veri.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  HiOutlineDesktopComputer, HiOutlineDocumentText, HiOutlineExclamationCircle, HiOutlineClock,
  HiOutlineTrendingUp, HiOutlineCurrencyDollar
} from 'react-icons/hi';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [licenseCosts, setLicenseCosts] = useState(null);
  const [deptDist, setDeptDist] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then(res => setSummary(res.data)).catch(() => {});
    api.get('/dashboard/license-costs').then(res => setLicenseCosts(res.data)).catch(() => {});
    api.get('/dashboard/department-distribution').then(res => setDeptDist(res.data)).catch(() => {});
    api.get('/dashboard/ticket-stats').then(res => setTicketStats(res.data)).catch(() => {});
  }, []);

  const costChartData = licenseCosts?.periods?.map(p => ({
    name: p.label,
    maliyet: p.totalCost,
    lisans_sayisi: p.licenses.length
  })) || [];

  const statusColors = {
    'Açık': '#ef4444',
    'İşlemde': '#f59e0b',
    'Beklemede': '#3b82f6',
    'Çözüldü': '#10b981'
  };

  const totalUpcomingCost = licenseCosts?.periods?.reduce((s, p) => s + p.totalCost, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 tracking-tight">IT Müdürü Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Sistem geneli özet ve analiz raporları</p>
      </div>

      {/* Özet Kartlar */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card card-hover">
            <div className="flex items-start justify-between">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-11 h-11 rounded-xl flex items-center justify-center shadow-md">
                <HiOutlineDesktopComputer className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-surface-800 mt-4">{summary.toplam_donanim}</p>
            <p className="text-xs text-surface-500 mt-1">Toplam Donanım</p>
          </div>
          <div className="stat-card card-hover">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 w-11 h-11 rounded-xl flex items-center justify-center shadow-md">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-surface-800 mt-4">{summary.toplam_lisans}</p>
            <p className="text-xs text-surface-500 mt-1">Toplam Lisans</p>
          </div>
          <div className="stat-card card-hover">
            <div className="bg-gradient-to-br from-red-500 to-rose-500 w-11 h-11 rounded-xl flex items-center justify-center shadow-md">
              <HiOutlineClock className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-red-600 mt-4">{summary.bu_ay_biten_lisanslar}</p>
            <p className="text-xs text-surface-500 mt-1">Bu Ay Biten Lisanslar</p>
          </div>
          <div className="stat-card card-hover">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 w-11 h-11 rounded-xl flex items-center justify-center shadow-md">
              <HiOutlineExclamationCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-surface-800 mt-4">{summary.acik_talepler}</p>
            <p className="text-xs text-surface-500 mt-1">Açık Arıza Talepleri</p>
          </div>
        </div>
      )}

      {/* Maliyet özeti */}
      {licenseCosts && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 text-white shadow-xl shadow-primary-500/20">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                <HiOutlineCurrencyDollar className="w-4 h-4" />
                90 Günlük Yenileme Maliyeti
              </div>
              <p className="text-4xl font-bold tracking-tight">{totalUpcomingCost.toLocaleString('tr-TR')} <span className="text-xl font-medium text-primary-200">TL</span></p>
              <p className="text-sm text-primary-100/80 mt-2">
                {licenseCosts.periods.reduce((s, p) => s + p.licenses.length, 0)} lisans yenilenecek
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl">
              <HiOutlineTrendingUp className="w-10 h-10" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yaklaşan Lisans Maliyetleri */}
        <div className="card">
          <h2 className="text-base font-bold text-surface-800 mb-1">Yaklaşan Lisans Yenileme Maliyetleri</h2>
          <p className="text-xs text-surface-500 mb-4">30, 60 ve 90 gün bazında</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costChartData}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                formatter={(value) => `${value.toLocaleString('tr-TR')} TL`}
              />
              <Bar dataKey="maliyet" fill="url(#costGradient)" radius={[8, 8, 0, 0]} name="Maliyet (TL)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Departman Dağılımı */}
        <div className="card">
          <h2 className="text-base font-bold text-surface-800 mb-1">Departman Bazlı Donanım Dağılımı</h2>
          <p className="text-xs text-surface-500 mb-4">Zimmetli donanım oranları</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={deptDist.filter(d => d.donanim_sayisi > 0)}
                cx="50%" cy="50%"
                innerRadius={70} outerRadius={110}
                paddingAngle={3}
                dataKey="donanim_sayisi"
                nameKey="departman_adi"
              >
                {deptDist.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {deptDist.filter(d => d.donanim_sayisi > 0).map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-surface-600">{d.departman_adi}</span>
                <span className="font-semibold text-surface-800">({d.donanim_sayisi})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arıza Durumu */}
        {ticketStats && (
          <div className="card">
            <h2 className="text-base font-bold text-surface-800 mb-1">Arıza Talep Durumları</h2>
            <p className="text-xs text-surface-500 mb-4">Mevcut duruma göre dağılım</p>
            <div className="space-y-3">
              {ticketStats.durum_dagilimi.map((item) => {
                const total = ticketStats.durum_dagilimi.reduce((s, i) => s + i.count, 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.durum}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[item.durum] }} />
                        <span className="text-sm font-medium text-surface-700">{item.durum}</span>
                      </div>
                      <span className="text-sm font-bold text-surface-800">{item.count}</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: statusColors[item.durum] }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 mt-4 border-t border-surface-100 flex items-center justify-between">
                <span className="text-xs text-surface-500">Ortalama Çözüm Süresi</span>
                <span className="text-lg font-bold text-surface-800">{ticketStats.ortalama_cozum_suresi} <span className="text-sm font-normal text-surface-500">gün</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Aylık Arıza Talepleri */}
        {ticketStats && ticketStats.aylik_talepler.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-surface-800 mb-1">Aylık Arıza Talepleri</h2>
            <p className="text-xs text-surface-500 mb-4">Son 6 ay</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ticketStats.aylik_talepler}>
                <defs>
                  <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="ay" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#ticketGradient)" name="Talep Sayısı" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detaylı Lisans Tablosu */}
      {licenseCosts && (
        <div className="card">
          <h2 className="text-base font-bold text-surface-800 mb-1">Yaklaşan Lisans Yenileme Detayları</h2>
          <p className="text-xs text-surface-500 mb-4">90 gün içinde süresi dolacak lisanslar</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-surface-100">
                <tr>
                  <th className="table-header">Yazılım</th>
                  <th className="table-header">Bitiş Tarihi</th>
                  <th className="table-header">Kalan Süre</th>
                  <th className="table-header text-right">Maliyet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {licenseCosts.periods.flatMap(p => p.licenses).map((lic) => {
                  const daysLeft = Math.ceil((new Date(lic.bitis_tarihi) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={lic.id} className="hover:bg-surface-50 transition-colors">
                      <td className="table-cell font-semibold">{lic.yazilim_adi}</td>
                      <td className="table-cell">{lic.bitis_tarihi}</td>
                      <td className="table-cell">
                        <span className={`badge ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {daysLeft} gün
                        </span>
                      </td>
                      <td className="table-cell font-semibold text-right">{lic.maliyet?.toLocaleString('tr-TR')} TL</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
