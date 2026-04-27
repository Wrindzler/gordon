/**
 * Tedarikçi rehberi: liste, ekleme/düzenleme/silme modalları üzerinden
 * yönetilir; faturalar tedarikçi kimliğine bağlanır.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function Vendors() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ firma_adi: '', iletisim_bilgisi: '' });

  const fetchData = () => api.get('/vendors').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setForm({ firma_adi: '', iletisim_bilgisi: '' }); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ firma_adi: item.firma_adi, iletisim_bilgisi: item.iletisim_bilgisi || '' }); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/vendors/${editing.id}`, form);
        toast.success('Tedarikçi güncellendi.');
      } else {
        await api.post('/vendors', form);
        toast.success('Tedarikçi eklendi.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/vendors/${id}`);
      toast.success('Tedarikçi silindi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silme başarısız.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tedarikçi Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Donanım ve lisans tedarikçilerini yönetin</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Yeni Tedarikçi
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Firma Adı</th>
                <th className="table-header">İletişim Bilgisi</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{item.firma_adi}</td>
                  <td className="table-cell">{item.iletisim_bilgisi || '-'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="icon-btn text-blue-600 hover:bg-blue-50" title="Düzenle"><HiOutlinePencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="icon-btn text-red-600 hover:bg-red-50" title="Sil"><HiOutlineTrash className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={3} className="table-cell text-center text-gray-400">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı</label>
            <input className="input-field" value={form.firma_adi} onChange={e => setForm({...form, firma_adi: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Bilgisi</label>
            <textarea className="input-field h-20 resize-none" value={form.iletisim_bilgisi} onChange={e => setForm({...form, iletisim_bilgisi: e.target.value})} placeholder="Email, telefon vb." />
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
