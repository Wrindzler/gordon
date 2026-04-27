/**
 * Arıza biletleri: personel cihazına göre filtre, IT/Destek tüm
 * açık kayıtlar; durum rozetleri ve güncelleme formu.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const statusBadge = {
  'Açık': 'bg-red-100 text-red-700',
  'İşlemde': 'bg-amber-100 text-amber-700',
  'Beklemede': 'bg-blue-100 text-blue-700',
  'Çözüldü': 'bg-green-100 text-green-700',
};

export default function Tickets() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const fetchData = () => api.get('/tickets').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const isITStaff = user?.rol === 'IT Destek' || user?.rol === 'IT Müdürü';

  const openStatusModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.durum);
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tickets/${selectedTicket.id}`, { durum: newStatus });
      toast.success('Talep durumu güncellendi.');
      setStatusModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Güncelleme başarısız.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Arıza Talepleri</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isITStaff ? 'Tüm arıza taleplerini yönetin' : 'Arıza taleplerinizi takip edin'}
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                {isITStaff && <th className="table-header">Personel</th>}
                <th className="table-header">Cihaz</th>
                <th className="table-header">Sorun</th>
                <th className="table-header">Talep Tarihi</th>
                <th className="table-header">Çözüm Tarihi</th>
                <th className="table-header">Durum</th>
                {isITStaff && <th className="table-header">İşlem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">#{item.id}</td>
                  {isITStaff && <td className="table-cell font-medium">{item.ad} {item.soyad}</td>}
                  <td className="table-cell">{item.marka} {item.model}</td>
                  <td className="table-cell max-w-xs truncate" title={item.sorun_aciklamasi}>{item.sorun_aciklamasi}</td>
                  <td className="table-cell">{item.talep_tarihi}</td>
                  <td className="table-cell">{item.cozum_tarihi || '-'}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusBadge[item.durum]}`}>{item.durum}</span>
                  </td>
                  {isITStaff && (
                    <td className="table-cell">
                      {item.durum !== 'Çözüldü' && (
                        <button onClick={() => openStatusModal(item)} className="btn-primary text-xs py-1 px-2">
                          Durum Güncelle
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={isITStaff ? 8 : 6} className="table-cell text-center text-gray-400">Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Talep Durumunu Güncelle" size="sm">
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              <strong>Cihaz:</strong> {selectedTicket?.marka} {selectedTicket?.model}<br />
              <strong>Sorun:</strong> {selectedTicket?.sorun_aciklamasi}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Durum</label>
            <select className="select-field" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="Açık">Açık</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Çözüldü">Çözüldü</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setStatusModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Güncelle</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
