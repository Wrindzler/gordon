/**
 * IT Müdürü: beyaz listelenmiş tabloların okunması, satır arama, PDF
 * dışa aktarımı (pdfmake + vfs, `addVirtualFileSystem` ile fontlar).
 */
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineDatabase, HiOutlineTable, HiOutlineRefresh, HiOutlineDownload,
  HiOutlineSearch, HiOutlineKey, HiOutlineChevronLeft, HiOutlineChevronRight,
} from 'react-icons/hi';

/**
 * pdfmake + vfs_fonts'ı npm paketinden dinamik import eder.
 * CDN bağımlılığını kaldırır (CSP, offline, ağ hataları PDF indirmesini kırabiliyordu).
 */
let _pdfMakePromise = null;
function loadPdfMake() {
  if (_pdfMakePromise) return _pdfMakePromise;
  _pdfMakePromise = (async () => {
    const [pdfMod, vfsMod] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);
    const pdfMake = pdfMod.default;
    const vfs = vfsMod.default;
    if (!pdfMake) throw new Error('pdfmake modülü yüklenemedi.');
    if (!vfs || typeof vfs !== 'object') {
      throw new Error('Font sanal dosya sistemi (vfs) yüklenemedi.');
    }
    // pdfmake 0.3+: sadece .vfs atamak VFS’i doldurmaz; addVirtualFileSystem gerekli (bold → Roboto-Medium.ttf).
    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs);
    } else {
      pdfMake.vfs = vfs;
    }
    return pdfMake;
  })();
  _pdfMakePromise.catch(() => { _pdfMakePromise = null; });
  return _pdfMakePromise;
}

/** Windows / tarayıcı dosya adı: geçersiz karakterleri atar. */
function safeExportFileName(tableName) {
  const date = new Date().toISOString().slice(0, 10);
  const base = String(tableName || 'tablo')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .trim() || 'tablo';
  return `${base}_${date}.pdf`;
}

/**
 * pdfmake / file-saver’ın .download() metodu asenkron; tıklama “user activation”
 * süresi bittiği için tarayıcılar indirmeyi sessizce yutabiliyor. Blob’u aldıktan
 * sonra <a download> ile tetiklemek (DOM’a ekleyerek) daha güvenilir.
 */
function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.position = 'fixed';
  a.style.left = '0';
  a.style.top = '0';
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatCell(value, column) {
  if (value === null || value === undefined) return <span className="text-surface-300 italic">null</span>;
  if (typeof value === 'number') return value.toLocaleString('tr-TR');
  const s = String(value);
  if (column.name.includes('hash') || column.name.includes('sifre')) {
    return <span className="font-mono text-xs text-surface-400" title={s}>{s.slice(0, 12)}…</span>;
  }
  if (s.length > 80) {
    return <span title={s}>{s.slice(0, 80)}…</span>;
  }
  return s;
}

export default function Database() {
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 100;

  const loadMeta = async () => {
    try {
      const [t, s] = await Promise.all([
        api.get('/database/tables'),
        api.get('/database/stats'),
      ]);
      setTables(t.data.tables);
      setStats(s.data);
      if (!active && t.data.tables.length) setActive(t.data.tables[0].name);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Veritabanı bilgisi alınamadı.');
    }
  };

  const loadTable = async (name, offset = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/database/tables/${name}`, {
        params: { limit: pageSize, offset },
      });
      setDetail(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Tablo okunamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => {
    if (!active) return;
    setPage(0);
    setSearch('');
    loadTable(active, 0);
  }, [active]);

  const filteredRows = useMemo(() => {
    if (!detail?.rows) return [];
    if (!search.trim()) return detail.rows;
    const q = search.toLowerCase();
    return detail.rows.filter((row) =>
      Object.values(row).some((v) => v !== null && String(v).toLowerCase().includes(q))
    );
  }, [detail, search]);

  /**
   * PDF olarak dışa aktarım — Türkçe karakter desteği için pdfmake + Roboto
   * fontu kullanır. Kütüphane ayrı parça olarak yüklenir.
   */
  const exportPDF = async () => {
    if (!detail || exporting) return;
    setExporting(true);
    try {
      const pdfMake = await loadPdfMake();

      const columns = detail.columns;
      const maxCellLen = 80;
      const headerRow = columns.map((c) => ({
        text: c.name,
        bold: true,
        color: '#ffffff',
        fillColor: '#006d77',
        noWrap: false,
      }));
      const body = filteredRows.map((row) =>
        columns.map((c) => {
          let v = row[c.name];
          if (v === null || v === undefined) return { text: '—', color: '#9ca3af', italics: true };
          // Şifre/hash sütunlarını PDF'te de maskele
          if (/hash|sifre/i.test(c.name) && typeof v === 'string') {
            return { text: v.slice(0, 10) + '…', color: '#9ca3af' };
          }
          let s = String(v);
          if (s.length > maxCellLen) s = s.slice(0, maxCellLen) + '…';
          return { text: s };
        })
      );

      const nowStr = new Date().toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const docDef = {
        pageSize: 'A4',
        pageOrientation: columns.length > 5 ? 'landscape' : 'portrait',
        pageMargins: [28, 60, 28, 40],
        info: {
          title: `${detail.label} - ULVİS`,
          author: 'ULVİS',
          subject: `Veritabanı dışa aktarımı: ${detail.name}`,
          creator: 'ULVİS',
        },
        header: {
          margin: [28, 18, 28, 0],
          columns: [
            { text: 'ULVİS', style: 'brandTitle' },
            { text: `Oluşturma: ${nowStr}`, style: 'brandDate', alignment: 'right' },
          ],
        },
        footer: (currentPage, pageCount) => ({
          text: `Sayfa ${currentPage} / ${pageCount}`,
          alignment: 'center',
          margin: [0, 15, 0, 0],
          fontSize: 9,
          color: '#6b7280',
        }),
        content: [
          { text: detail.label, style: 'title' },
          {
            text:
              `Tablo: ${detail.name}  ·  Toplam kayıt: ${detail.total.toLocaleString('tr-TR')}` +
              `  ·  Bu belgede: ${filteredRows.length.toLocaleString('tr-TR')}` +
              (search ? `  ·  Arama: "${search}"` : ''),
            style: 'subtitle',
            margin: [0, 2, 0, 12],
          },
          filteredRows.length
            ? {
                table: {
                  headerRows: 1,
                  widths: columns.map(() => '*'),
                  body: [headerRow, ...body],
                  dontBreakRows: true,
                },
                layout: {
                  fillColor: (rowIndex) =>
                    rowIndex === 0 ? '#006d77' : rowIndex % 2 === 0 ? '#f1f7f7' : null,
                  hLineColor: () => '#dbeae5',
                  vLineColor: () => '#dbeae5',
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                  paddingLeft: () => 6,
                  paddingRight: () => 6,
                },
              }
            : { text: 'Gösterilecek kayıt yok.', italics: true, color: '#6b7280' },
        ],
        styles: {
          brandTitle: { fontSize: 11, bold: true, color: '#006d77' },
          brandDate: { fontSize: 9, color: '#6b7280' },
          title: { fontSize: 16, bold: true, color: '#003d40', margin: [0, 0, 0, 2] },
          subtitle: { fontSize: 9, color: '#6b7280' },
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 8,
        },
      };

      const filename = safeExportFileName(detail.name);
      const pdf = pdfMake.createPdf(docDef);
      const blob = await pdf.getBlob();
      if (!blob || blob.size === 0) {
        throw new Error('PDF oluşturulamadı (boş belge).');
      }
      downloadPdfBlob(blob, filename);
      toast.success('PDF indirildi.');
    } catch (e) {
      console.error(e);
      toast.error('PDF oluşturulamadı: ' + (e?.message || 'bilinmeyen hata'));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = detail ? Math.max(1, Math.ceil(detail.total / pageSize)) : 1;
  const goPage = (p) => {
    const next = Math.max(0, Math.min(totalPages - 1, p));
    setPage(next);
    loadTable(active, next * pageSize);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 tracking-tight flex items-center gap-2">
            <HiOutlineDatabase className="w-6 h-6 text-primary-600" />
            Veritabanı
          </h1>
          <p className="text-surface-500 text-sm mt-1">SQLite tablolarını görüntüle ve dışa aktar</p>
        </div>
        <button
          onClick={loadMeta}
          className="btn-secondary flex items-center gap-2"
          title="Yenile"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Tablo" value={stats.totalTables} color="from-blue-500 to-cyan-500" icon={HiOutlineTable} />
          <StatCard label="Toplam Kayıt" value={stats.totalRows.toLocaleString('tr-TR')} color="from-emerald-500 to-teal-500" icon={HiOutlineDatabase} />
          <StatCard label="Dosya Boyutu" value={formatBytes(stats.sizeBytes)} color="from-purple-500 to-pink-500" icon={HiOutlineKey} />
          <StatCard label="Motor" value="SQLite · WAL" color="from-amber-500 to-orange-500" icon={HiOutlineDatabase} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Tables list */}
        <div className="card p-3 h-fit">
          <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 px-2 mb-2">Tablolar</p>
          <div className="space-y-1">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setActive(t.name)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  active === t.name
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/30'
                    : 'text-surface-700 hover:bg-surface-100'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <HiOutlineTable className={`w-4 h-4 flex-shrink-0 ${active === t.name ? 'text-white' : 'text-surface-400'}`} />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  active === t.name ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
                }`}>
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table detail */}
        <div className="card p-0 overflow-hidden">
          {!detail ? (
            <div className="p-10 text-center text-surface-400">
              {loading ? 'Yükleniyor...' : 'Bir tablo seçin'}
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between gap-3 flex-wrap bg-surface-50/50">
                <div className="min-w-0">
                  <h2 className="font-bold text-surface-800 truncate">{detail.label}</h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    <span className="font-mono">{detail.name}</span> · {detail.total.toLocaleString('tr-TR')} kayıt ·
                    {' '}{detail.columns.length} kolon
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Ara..."
                      className="pl-9 pr-3 py-2 rounded-xl text-sm bg-white border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none w-44"
                    />
                  </div>
                  <button
                    onClick={exportPDF}
                    disabled={exporting || !detail}
                    className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Görünen kayıtları PDF olarak indir"
                  >
                    <HiOutlineDownload className="w-4 h-4" />
                    {exporting ? 'Hazırlanıyor...' : 'PDF'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 sticky top-0 z-10">
                    <tr>
                      {detail.columns.map((c) => (
                        <th
                          key={c.name}
                          className="text-left px-4 py-2.5 text-[11px] font-bold text-surface-500 uppercase tracking-wider whitespace-nowrap border-b border-surface-200"
                        >
                          <div className="flex items-center gap-1.5">
                            {c.pk && <HiOutlineKey className="w-3 h-3 text-amber-500" title="Primary Key" />}
                            <span>{c.name}</span>
                            <span className="text-[9px] font-medium text-surface-400 normal-case">{c.type}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredRows.map((row, i) => (
                      <tr key={i} className="hover:bg-primary-50/30 transition-colors">
                        {detail.columns.map((c) => (
                          <td key={c.name} className="px-4 py-2 text-surface-700 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                            {formatCell(row[c.name], c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={detail.columns.length} className="px-4 py-10 text-center text-surface-400">
                          {search ? 'Aramayla eşleşen kayıt yok' : 'Bu tabloda kayıt yok'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {detail.total > pageSize && (
                <div className="px-5 py-3 border-t border-surface-100 flex items-center justify-between text-sm">
                  <span className="text-surface-500 text-xs">
                    {detail.offset + 1}-{Math.min(detail.offset + pageSize, detail.total)} / {detail.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goPage(page - 1)}
                      disabled={page === 0 || loading}
                      className="w-8 h-8 rounded-lg hover:bg-surface-100 disabled:opacity-40 flex items-center justify-center"
                    >
                      <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-surface-600 px-3 font-semibold">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => goPage(page + 1)}
                      disabled={page >= totalPages - 1 || loading}
                      className="w-8 h-8 rounded-lg hover:bg-surface-100 disabled:opacity-40 flex items-center justify-center"
                    >
                      <HiOutlineChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="stat-card card-hover">
      <div className={`bg-gradient-to-br ${color} w-10 h-10 rounded-xl flex items-center justify-center shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-surface-800 mt-3">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
    </div>
  );
}
