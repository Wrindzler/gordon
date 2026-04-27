/**
 * Bildirim merkezi: listele, oku, tümünü oku, manuel lisans
 * denetim tetikleme (yetkiye tabi) için API çağrıları.
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlineCheck, HiOutlineRefresh } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();
  const canTriggerCheck = user && ['IT Müdürü', 'Satınalma'].includes(user.rol);

  const fetchData = () => api.get('/notifications').then(res => setItems(res.data)).catch(() => {});
  useEffect(() => { fetchData(); }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchData();
    } catch {
      toast.error('İşlem başarısız.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      toast.success('Tüm bildirimler okundu.');
      fetchData();
    } catch {
      toast.error('İşlem başarısız.');
    }
  };

  const runLicenseCheck = async () => {
    setChecking(true);
    try {
      const { data } = await api.post('/notifications/check-expiring');
      const created = data?.stats?.totalCreated ?? 0;
      if (created > 0) {
        toast.success(`${created} yeni lisans bildirimi oluşturuldu.`);
      } else {
        toast('Yeni bildirim yok, her şey güncel.', { icon: 'ℹ️' });
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lisans kontrolü başarısız.');
    } finally {
      setChecking(false);
    }
  };

  const unreadCount = items.filter(n => !n.okundu).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bildirimler</h1>
          <p className="text-gray-500 text-sm mt-1">{unreadCount} okunmamış bildirim</p>
        </div>
        <div className="flex items-center gap-2">
          {canTriggerCheck && (
            <button
              onClick={runLicenseCheck}
              disabled={checking}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              title="30/15/7 gün içinde dolan lisansları kontrol et ve bildirim üret"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Kontrol ediliyor...' : 'Lisans Kontrolü Yap'}
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn-secondary flex items-center gap-2">
              <HiOutlineCheck className="w-4 h-4" /> Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const colorMap = {
            'Lisans': { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', text: 'text-amber-600' },
            'Arıza': { bg: 'bg-gradient-to-br from-red-400 to-rose-500', text: 'text-red-600' },
            'Zimmet': { bg: 'bg-gradient-to-br from-blue-400 to-indigo-500', text: 'text-blue-600' },
          };
          const type = Object.keys(colorMap).find(k => item.baslik.includes(k));
          const colors = colorMap[type] || { bg: 'bg-gradient-to-br from-surface-400 to-surface-500', text: 'text-surface-600' };

          return (
            <div
              key={item.id}
              className={`card card-hover flex items-start gap-4 cursor-pointer ${!item.okundu ? 'border-primary-200 bg-gradient-to-r from-primary-50/50 to-transparent' : ''}`}
              onClick={() => !item.okundu && markAsRead(item.id)}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${colors.bg}`}>
                <HiOutlineBell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-bold ${!item.okundu ? 'text-surface-900' : 'text-surface-600'}`}>{item.baslik}</h3>
                  {!item.okundu && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 animate-pulse" />}
                </div>
                <p className="text-sm text-surface-600 mt-1">{item.mesaj?.replace(/\s*\[LIC:\d+\|TRIG:\d+\]\s*$/, '').trim()}</p>
                <p className="text-xs text-surface-400 mt-2">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HiOutlineBell className="w-8 h-8 text-surface-300" />
            </div>
            <p className="text-surface-500 font-medium">Henüz bildiriminiz yok</p>
            <p className="text-sm text-surface-400 mt-1">Yeni bildirimleriniz burada görünecek</p>
          </div>
        )}
      </div>
    </div>
  );
}
