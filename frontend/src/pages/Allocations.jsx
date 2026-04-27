/**
 * Zimmet listesi: personel/IT ayrımları API sorgusunda; onay, ret,
 * yeni zimmet talebi modalları.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus } from 'react-icons/hi';

const statusBadge = {
  'Onay Bekliyor': 'bg-amber-100 text-amber-700',
  'Onaylandı': 'bg-green-100 text-green-700',
  'Reddedildi': 'bg-red-100 text-red-700',
  'İade Edildi': 'bg-gray-100 text-gray-500',
};

export default function Allocations() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [availableHw, setAvailableHw] = useState([]);
  const [availableLic, setAvailableLic] = useState([]);
  const [form, setForm] = useState({ kullanici_id: '', varlik_tipi: 'Donanım', varlik_id: '' });

  const fetchData = () => api.get('/allocations').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const openNew = async () => {
    try {
      const [usersRes, hwRes, licRes] = await Promise.all([
        api.get('/users/personel'),
        api.get('/hardware/musait'),
        api.get('/licenses/aktif')
      ]);
      setUsers(usersRes.data);
      setAvailableHw(hwRes.data);
      setAvailableLic(licRes.data);
      setForm({ kullanici_id: '', varlik_tipi: 'Donanım', varlik_id: '' });
      setModalOpen(true);
    } catch {
      toast.error('Veriler yüklenemedi.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/allocations', {
        kullanici_id: parseInt(form.kullanici_id),
        varlik_tipi: form.varlik_tipi,
        varlik_id: parseInt(form.varlik_id)
      });
      toast.success('Zimmet talebi oluşturuldu.');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleReturn = async (id) => {
    if (!confirm('Bu zimmeti iade etmek istediğinize emin misiniz?')) return;
    try {
      await api.put(`/allocations/${id}/iade`);
      toast.success('Varlık iade edildi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İade başarısız.');
    }
  };

  const assetOptions = form.varlik_tipi === 'Donanım'
    ? availableHw.map(h => ({ id: h.id, label: `${h.marka} ${h.model} (${h.seri_no})` }))
    : availableLic.map(l => ({ id: l.id, label: l.yazilim_adi }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Zimmet Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Donanım ve yazılım zimmetlerini yönetin</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Zimmet Ata
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Personel</th>
                <th className="table-header">Varlık Tipi</th>
                <th className="table-header">Varlık</th>
                <th className="table-header">Zimmet Tarihi</th>
                <th className="table-header">İade Tarihi</th>
                <th className="table-header">Durum</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{item.ad} {item.soyad}</td>
                  <td className="table-cell">
                    <span className={`badge ${item.varlik_tipi === 'Donanım' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {item.varlik_tipi}
                    </span>
                  </td>
                  <td className="table-cell">{item.varlik_adi}</td>
                  <td className="table-cell">{item.zimmet_tarihi}</td>
                  <td className="table-cell">{item.iade_tarihi || '-'}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusBadge[item.onay_durumu]}`}>{item.onay_durumu}</span>
                  </td>
                  <td className="table-cell">
                    {(item.onay_durumu === 'Onaylandı' || item.onay_durumu === 'Onay Bekliyor') && (
                      <button onClick={() => handleReturn(item.id)} className="btn-warning text-xs py-1 px-2">
                        İade Et
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Zimmet Ata">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personel</label>
            <select className="select-field" value={form.kullanici_id} onChange={e => setForm({...form, kullanici_id: e.target.value})} required>
              <option value="">Seçiniz...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.ad} {u.soyad} - {u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Varlık Tipi</label>
            <select className="select-field" value={form.varlik_tipi} onChange={e => setForm({...form, varlik_tipi: e.target.value, varlik_id: ''})}>
              <option value="Donanım">Donanım</option>
              <option value="Yazılım">Yazılım</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Varlık</label>
            <select className="select-field" value={form.varlik_id} onChange={e => setForm({...form, varlik_id: e.target.value})} required>
              <option value="">Seçiniz...</option>
              {assetOptions.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            {assetOptions.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Müsait {form.varlik_tipi.toLowerCase()} bulunamadı.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Zimmet Ata</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
