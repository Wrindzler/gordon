/**
 * Yazılım lisansları: arama, bitiş süzgeci, kalan gün (istemci
 * hesabı) ve satır `durum`u API’de senkronize edilecek biçimde
 * sunucuya yazılır.
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const statusBadge = {
  'Aktif': 'bg-green-100 text-green-700',
  'Süresi Dolmuş': 'bg-red-100 text-red-700',
  'Pasif': 'bg-gray-100 text-gray-500',
};

export default function Licenses() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ yazilim_adi: '', lisans_anahtari: '', baslangic_tarihi: '', bitis_tarihi: '', maliyet: '', durum: 'Aktif' });
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');

  const getDaysLeft = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search ||
        item.yazilim_adi?.toLowerCase().includes(search.toLowerCase()) ||
        item.lisans_anahtari?.toLowerCase().includes(search.toLowerCase());
      let matchesExpiry = true;
      if (expiryFilter) {
        const d = getDaysLeft(item.bitis_tarihi);
        if (expiryFilter === 'expired') matchesExpiry = d !== null && d < 0;
        else if (expiryFilter === '7') matchesExpiry = d !== null && d >= 0 && d <= 7;
        else if (expiryFilter === '30') matchesExpiry = d !== null && d >= 0 && d <= 30;
        else if (expiryFilter === '90') matchesExpiry = d !== null && d >= 0 && d <= 90;
      }
      return matchesSearch && matchesExpiry;
    });
  }, [items, search, expiryFilter]);

  const fetchData = () => api.get('/licenses').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ yazilim_adi: '', lisans_anahtari: '', baslangic_tarihi: '', bitis_tarihi: '', maliyet: '', durum: 'Aktif' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      yazilim_adi: item.yazilim_adi, lisans_anahtari: item.lisans_anahtari || '',
      baslangic_tarihi: item.baslangic_tarihi || '', bitis_tarihi: item.bitis_tarihi || '',
      maliyet: item.maliyet || '', durum: item.durum
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, maliyet: parseFloat(form.maliyet) || 0 };
      if (editing) {
        await api.put(`/licenses/${editing.id}`, data);
        toast.success('Lisans güncellendi.');
      } else {
        await api.post('/licenses', data);
        toast.success('Lisans eklendi.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu lisansı pasife almak istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/licenses/${id}`);
      toast.success('Lisans pasife alındı.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silme başarısız.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Yazılım Lisansları</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam <span className="font-semibold text-gray-700">{filteredItems.length}</span> / {items.length} lisans
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Yeni Lisans
        </button>
      </div>

      <div className="card mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Yazılım adı veya lisans anahtarı ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} className="select-field md:w-56">
          <option value="">Tüm Bitiş Tarihleri</option>
          <option value="expired">Süresi Dolmuş</option>
          <option value="7">7 Gün İçinde Bitecek</option>
          <option value="30">30 Gün İçinde Bitecek</option>
          <option value="90">90 Gün İçinde Bitecek</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Yazılım</th>
                <th className="table-header">Lisans Anahtarı</th>
                <th className="table-header">Başlangıç</th>
                <th className="table-header">Bitiş</th>
                <th className="table-header">Kalan</th>
                <th className="table-header">Maliyet</th>
                <th className="table-header">Durum</th>
                <th className="table-header">Zimmetli</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map(item => {
                const daysLeft = getDaysLeft(item.bitis_tarihi);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{item.yazilim_adi}</td>
                    <td className="table-cell font-mono text-xs">{item.lisans_anahtari || '-'}</td>
                    <td className="table-cell">{item.baslangic_tarihi || '-'}</td>
                    <td className="table-cell">{item.bitis_tarihi || '-'}</td>
                    <td className="table-cell">
                      {daysLeft !== null && (
                        <span className={`badge ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {daysLeft > 0 ? `${daysLeft} gün` : 'Dolmuş'}
                        </span>
                      )}
                    </td>
                    <td className="table-cell">{item.maliyet?.toLocaleString('tr-TR')} TL</td>
                    <td className="table-cell">
                      <span className={`badge ${statusBadge[item.durum]}`}>{item.durum}</span>
                    </td>
                    <td className="table-cell">{item.zimmetli_kisi || '-'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="icon-btn text-blue-600 hover:bg-blue-50" title="Düzenle">
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="icon-btn text-red-600 hover:bg-red-50" title="Pasife Al">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Lisans Düzenle' : 'Yeni Lisans Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yazılım Adı</label>
            <input className="input-field" value={form.yazilim_adi} onChange={e => setForm({...form, yazilim_adi: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lisans Anahtarı</label>
            <input className="input-field" value={form.lisans_anahtari} onChange={e => setForm({...form, lisans_anahtari: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
              <input type="date" className="input-field" value={form.baslangic_tarihi} onChange={e => setForm({...form, baslangic_tarihi: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
              <input type="date" className="input-field" value={form.bitis_tarihi} onChange={e => setForm({...form, bitis_tarihi: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maliyet (TL)</label>
              <input type="number" className="input-field" value={form.maliyet} onChange={e => setForm({...form, maliyet: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Güncelle' : 'Ekle'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
