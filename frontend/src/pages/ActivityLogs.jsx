/**
 * Denetim günlüğü: arama, sayfalama, taze yenile; yalnızca IT Müdürü
 * uçsunda listelenen kayıtlar.
 */
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineCollection, HiOutlineSearch, HiOutlineRefresh, HiOutlineChevronLeft, HiOutlineChevronRight,
} from 'react-icons/hi';

const pageSize = 50;

export default function ActivityLogs() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/activity-logs', {
        params: { limit: pageSize, offset, q: q || undefined },
      });
      setRows(data.rows || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Loglar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [offset, q]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const onSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    setQ(searchInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.floor(offset / pageSize) + 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 tracking-tight flex items-center gap-2">
            <HiOutlineCollection className="w-7 h-7 text-primary-600" />
            İşlem Günlüğü
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Sistemde yapılan işlemlerin kaydı (giriş, CRUD, zimmet, arıza vb.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fetchLogs()} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Açıklama, e-posta, yol veya detayda ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>
        <button type="submit" className="btn-primary">Ara</button>
        {q && (
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              setSearchInput('');
              setQ('');
              setOffset(0);
            }}
          >
            Temizle
          </button>
        )}
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-100">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider whitespace-nowrap">Tarih</th>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider whitespace-nowrap">Kullanıcı</th>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider whitespace-nowrap">Rol</th>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider whitespace-nowrap">İşlem</th>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider min-w-[200px]">Açıklama</th>
                <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider max-w-xs">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-surface-400">Yükleniyor...</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-surface-400">Kayıt bulunamadı</td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-50/80">
                  <td className="px-4 py-3 text-surface-600 whitespace-nowrap text-xs font-mono">
                    {row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-surface-800">{row.kullanici_email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-surface-100 text-surface-700 text-xs">{row.kullanici_rol || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-surface-600 whitespace-nowrap">
                    <span className="font-semibold text-primary-700">{row.yontem}</span>
                    <span className="text-surface-400 block truncate max-w-[180px]" title={row.yol}>{row.yol}</span>
                  </td>
                  <td className="px-4 py-3 text-surface-800">{row.aciklama}</td>
                  <td className="px-4 py-3 text-xs text-surface-500 max-w-md">
                    {row.detay ? (
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] bg-surface-50 rounded-lg p-2 max-h-24 overflow-y-auto">{row.detay}</pre>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && total > pageSize && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between bg-surface-50/50">
            <span className="text-xs text-surface-500">
              Toplam {total.toLocaleString('tr-TR')} kayıt · Sayfa {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                className="w-9 h-9 rounded-lg hover:bg-surface-200 disabled:opacity-40 flex items-center justify-center"
              >
                <HiOutlineChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={offset + pageSize >= total}
                onClick={() => setOffset((o) => o + pageSize)}
                className="w-9 h-9 rounded-lg hover:bg-surface-200 disabled:opacity-40 flex items-center justify-center"
              >
                <HiOutlineChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
