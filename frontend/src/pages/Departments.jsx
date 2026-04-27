/**
 * Departman referans yönetimi: çok satırlı basit CRUD, kullanıcı
 * formlarında dış anahtar olarak kullanılır.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');

  const fetchData = () => api.get('/departments').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setName(''); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setName(item.departman_adi); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, { departman_adi: name });
        toast.success('Departman güncellendi.');
      } else {
        await api.post('/departments', { departman_adi: name });
        toast.success('Departman oluşturuldu.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu departmanı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Departman silindi.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silme başarısız.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Departman Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Şirket departmanlarını yönetin</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Yeni Departman
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">Departman Adı</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono">#{item.id}</td>
                  <td className="table-cell font-medium">{item.departman_adi}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="icon-btn text-blue-600 hover:bg-blue-50" title="Düzenle"><HiOutlinePencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="icon-btn text-red-600 hover:bg-red-50" title="Sil"><HiOutlineTrash className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Departman Düzenle' : 'Yeni Departman'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departman Adı</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Güncelle' : 'Oluştur'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
