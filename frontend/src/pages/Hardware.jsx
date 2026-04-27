/**
 * Donanım envanteri: arama, durum süzgeci, zimmetli adı; pasife
 * alma ve düzenleme.
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const statusBadge = {
  'Müsait': 'bg-green-100 text-green-700',
  'Kullanımda': 'bg-blue-100 text-blue-700',
  'Arızalı': 'bg-red-100 text-red-700',
  'Pasif': 'bg-gray-100 text-gray-500',
};

export default function Hardware() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ seri_no: '', marka: '', model: '', alim_tarihi: '', durum: 'Müsait' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search ||
        item.seri_no?.toLowerCase().includes(search.toLowerCase()) ||
        item.marka?.toLowerCase().includes(search.toLowerCase()) ||
        item.model?.toLowerCase().includes(search.toLowerCase()) ||
        item.zimmetli_kisi?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || item.durum === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const fetchData = () => api.get('/hardware').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ seri_no: '', marka: '', model: '', alim_tarihi: '', durum: 'Müsait' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ seri_no: item.seri_no, marka: item.marka, model: item.model, alim_tarihi: item.alim_tarihi || '', durum: item.durum });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/hardware/${editing.id}`, form);
        toast.success('Donanım güncellendi.');
      } else {
        await api.post('/hardware', form);
        toast.success('Donanım eklendi.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu donanımı pasife almak istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/hardware/${id}`);
      toast.success('Donanım pasife alındı.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silme başarısız.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Donanım Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam <span className="font-semibold text-gray-700">{filteredItems.length}</span> / {items.length} donanım
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Yeni Donanım
        </button>
      </div>

      <div className="card mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Seri no, marka, model veya zimmetli kişi ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-field md:w-48">
          <option value="">Tüm Durumlar</option>
          <option value="Müsait">Müsait</option>
          <option value="Kullanımda">Kullanımda</option>
          <option value="Arızalı">Arızalı</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Seri No</th>
                <th className="table-header">Marka</th>
                <th className="table-header">Model</th>
                <th className="table-header">Alım Tarihi</th>
                <th className="table-header">Durum</th>
                <th className="table-header">Zimmetli Kişi</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{item.seri_no}</td>
                  <td className="table-cell font-medium">{item.marka}</td>
                  <td className="table-cell">{item.model}</td>
                  <td className="table-cell">{item.alim_tarihi || '-'}</td>
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
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Donanım Düzenle' : 'Yeni Donanım Ekle'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
            <input className="input-field" value={form.seri_no} onChange={e => setForm({...form, seri_no: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
              <input className="input-field" value={form.marka} onChange={e => setForm({...form, marka: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input className="input-field" value={form.model} onChange={e => setForm({...form, model: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alım Tarihi</label>
              <input type="date" className="input-field" value={form.alim_tarihi} onChange={e => setForm({...form, alim_tarihi: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select className="select-field" value={form.durum} onChange={e => setForm({...form, durum: e.target.value})}>
                <option value="Müsait">Müsait</option>
                <option value="Kullanımda">Kullanımda</option>
                <option value="Arızalı">Arızalı</option>
              </select>
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
