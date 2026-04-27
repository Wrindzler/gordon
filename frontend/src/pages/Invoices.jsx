/**
 * Satınalma faturaları: tedarikçi bağı, rol bazlı form (Satınalma + IT
 * Müdürü); CRUD uçları `/api/invoices` üzerinden.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function Invoices() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ tedarikci_id: '', toplam_tutar: '', fatura_tarihi: '', aciklama: '' });

  const isSatinalma = user?.rol === 'Satınalma';

  const fetchData = () => {
    api.get('/invoices').then(res => setItems(res.data)).catch(() => {});
    api.get('/vendors').then(res => setVendors(res.data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ tedarikci_id: '', toplam_tutar: '', fatura_tarihi: '', aciklama: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ tedarikci_id: item.tedarikci_id, toplam_tutar: item.toplam_tutar, fatura_tarihi: item.fatura_tarihi, aciklama: item.aciklama || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, tedarikci_id: parseInt(form.tedarikci_id), toplam_tutar: parseFloat(form.toplam_tutar) };
      if (editing) {
        await api.put(`/invoices/${editing.id}`, data);
        toast.success('Fatura güncellendi.');
      } else {
        await api.post('/invoices', data);
        toast.success('Fatura eklendi.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Fatura silindi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silme başarısız.');
    }
  };

  const totalAmount = items.reduce((sum, i) => sum + i.toplam_tutar, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Satınalma Faturaları</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam: <span className="font-semibold text-gray-800">{totalAmount.toLocaleString('tr-TR')} TL</span>
          </p>
        </div>
        {isSatinalma && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Yeni Fatura
          </button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Sıra</th>
                <th className="table-header">Tedarikçi</th>
                <th className="table-header">Tutar</th>
                <th className="table-header">Tarih</th>
                <th className="table-header">Açıklama</th>
                {isSatinalma && <th className="table-header">İşlem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{items.length - index}</td>
                  <td className="table-cell font-medium">{item.firma_adi}</td>
                  <td className="table-cell font-semibold">{item.toplam_tutar.toLocaleString('tr-TR')} TL</td>
                  <td className="table-cell">{item.fatura_tarihi}</td>
                  <td className="table-cell max-w-xs truncate" title={item.aciklama}>{item.aciklama || '-'}</td>
                  {isSatinalma && (
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="icon-btn text-blue-600 hover:bg-blue-50" title="Düzenle"><HiOutlinePencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="icon-btn text-red-600 hover:bg-red-50" title="Sil"><HiOutlineTrash className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={isSatinalma ? 6 : 5} className="table-cell text-center text-gray-400">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Fatura Düzenle' : 'Yeni Fatura Ekle'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
            <select className="select-field" value={form.tedarikci_id} onChange={e => setForm({...form, tedarikci_id: e.target.value})} required>
              <option value="">Seçiniz...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.firma_adi}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Tutar (TL)</label>
              <input type="number" step="0.01" className="input-field" value={form.toplam_tutar} onChange={e => setForm({...form, toplam_tutar: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fatura Tarihi</label>
              <input type="date" className="input-field" value={form.fatura_tarihi} onChange={e => setForm({...form, fatura_tarihi: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea className="input-field h-20 resize-none" value={form.aciklama} onChange={e => setForm({...form, aciklama: e.target.value})} />
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
