/**
 * Personel: kendi zimmetleri, onay/iade bekleme durumları, arıza
 * açma gibi giriş noktaları.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

export default function MyAssets() {
  const [allocations, setAllocations] = useState([]);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [sorunAciklamasi, setSorunAciklamasi] = useState('');

  const fetchData = () => api.get('/allocations').then(res => setAllocations(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const activeAllocations = allocations.filter(a => a.onay_durumu === 'Onaylandı' || a.onay_durumu === 'Onay Bekliyor');

  const handleApprove = async (id) => {
    try {
      await api.put(`/allocations/${id}/onayla`);
      toast.success('Zimmet onaylandı.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Onay başarısız.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/allocations/${id}/reddet`);
      toast.success('Zimmet reddedildi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Red başarısız.');
    }
  };

  const handleReturn = async (id) => {
    if (!confirm('Bu cihazı iade etmek istediğinize emin misiniz?')) return;
    try {
      await api.put(`/allocations/${id}/iade`);
      toast.success('Cihaz iade edildi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İade başarısız.');
    }
  };

  const openTicketModal = (alloc) => {
    setSelectedAllocation(alloc);
    setSorunAciklamasi('');
    setTicketModalOpen(true);
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', {
        donanim_id: selectedAllocation.varlik_id,
        sorun_aciklamasi: sorunAciklamasi
      });
      toast.success('Arıza talebi oluşturuldu.');
      setTicketModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Talep oluşturulamadı.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Varlıklarım</h1>
        <p className="text-gray-500 text-sm mt-1">Üzerinize zimmetli donanım ve yazılımlar</p>
      </div>

      {/* Onay bekleyen zimmetler */}
      {allocations.filter(a => a.onay_durumu === 'Onay Bekliyor').length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Onay Bekleyen Zimmetler</h2>
          <div className="space-y-3">
            {allocations.filter(a => a.onay_durumu === 'Onay Bekliyor').map(alloc => (
              <div key={alloc.id} className="card border-amber-200 bg-amber-50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{alloc.varlik_adi}</p>
                  <p className="text-sm text-gray-500">{alloc.varlik_tipi} - {alloc.zimmet_tarihi}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(alloc.id)} className="btn-success text-xs">Onayla</button>
                  <button onClick={() => handleReject(alloc.id)} className="btn-danger text-xs">Reddet</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktif zimmetler */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Varlık Tipi</th>
                <th className="table-header">Varlık</th>
                <th className="table-header">Zimmet Tarihi</th>
                <th className="table-header">Durum</th>
                <th className="table-header">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeAllocations.filter(a => a.onay_durumu === 'Onaylandı').map(alloc => (
                <tr key={alloc.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className={`badge ${alloc.varlik_tipi === 'Donanım' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {alloc.varlik_tipi}
                    </span>
                  </td>
                  <td className="table-cell font-medium">{alloc.varlik_adi}</td>
                  <td className="table-cell">{alloc.zimmet_tarihi}</td>
                  <td className="table-cell">
                    <span className="badge bg-green-100 text-green-700">Aktif</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {alloc.varlik_tipi === 'Donanım' && (
                        <button onClick={() => openTicketModal(alloc)} className="btn-warning text-xs py-1 px-2 flex items-center gap-1">
                          <HiOutlineExclamationCircle className="w-3 h-3" /> Arıza Bildir
                        </button>
                      )}
                      <button onClick={() => handleReturn(alloc.id)} className="btn-secondary text-xs py-1 px-2">
                        İade Et
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeAllocations.filter(a => a.onay_durumu === 'Onaylandı').length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-gray-400">Aktif zimmetiniz bulunmamaktadır</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arıza Bildirim Modal */}
      <Modal isOpen={ticketModalOpen} onClose={() => setTicketModalOpen(false)} title="Arıza Bildir">
        <form onSubmit={handleTicketSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Cihaz:</strong> {selectedAllocation?.varlik_adi}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sorun Açıklaması</label>
            <textarea
              className="input-field h-32 resize-none"
              value={sorunAciklamasi}
              onChange={e => setSorunAciklamasi(e.target.value)}
              placeholder="Sorunu detaylı olarak açıklayınız..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setTicketModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Talebi Gönder</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
