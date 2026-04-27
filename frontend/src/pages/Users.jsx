/**
 * Kullanıcı yönetimi: rol/departman listeleri, ekle-düzenle, IT şifre
 * sıfırlama; parola formu `PasswordStrength` ile doğrulanır.
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import PasswordStrength from '../components/PasswordStrength';
import { isPasswordValid } from '../utils/passwordPolicy';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineKey,
  HiOutlineClipboardCopy,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineShieldCheck,
  HiOutlineExclamation,
} from 'react-icons/hi';

export default function Users() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([
    { id: 1, rol_adi: 'Personel' },
    { id: 2, rol_adi: 'IT Destek' },
    { id: 3, rol_adi: 'Satınalma' },
    { id: 4, rol_adi: 'IT Müdürü' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ad: '', soyad: '', email: '', sifre: '', departman_id: '', rol_id: '' });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [resetTarget, setResetTarget] = useState(null); // kullanıcı nesnesi
  const [resetMode, setResetMode] = useState('auto'); // 'auto' | 'manual'
  const [resetManualPwd, setResetManualPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { user, gecici_sifre, mail_gonderildi }
  const [resultPwdVisible, setResultPwdVisible] = useState(false);
  const [formPwdVisible, setFormPwdVisible] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search ||
        item.ad?.toLowerCase().includes(search.toLowerCase()) ||
        item.soyad?.toLowerCase().includes(search.toLowerCase()) ||
        item.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = !roleFilter || item.rol_adi === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [items, search, roleFilter]);

  const fetchData = () => {
    api.get('/users').then(res => setItems(res.data)).catch(() => {});
    api.get('/departments').then(res => setDepartments(res.data)).catch(() => {});
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ad: '', soyad: '', email: '', sifre: '', departman_id: '', rol_id: '' });
    setFormPwdVisible(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ad: item.ad, soyad: item.soyad, email: item.email, sifre: '', departman_id: item.departman_id || '', rol_id: item.rol_id });
    setFormPwdVisible(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, departman_id: form.departman_id ? parseInt(form.departman_id) : null, rol_id: parseInt(form.rol_id) };
      // Yeni kullanıcıda şifre her zaman, düzenlemede ise yalnızca girilmişse
      // kurumsal şifre politikasına uymalıdır.
      if (!editing) {
        if (!isPasswordValid(data.sifre)) {
          toast.error('Şifre kurumsal şifre kurallarına uymuyor.');
          return;
        }
      } else if (data.sifre) {
        if (!isPasswordValid(data.sifre)) {
          toast.error('Şifre kurumsal şifre kurallarına uymuyor.');
          return;
        }
      }
      if (editing) {
        if (!data.sifre) delete data.sifre;
        await api.put(`/users/${editing.id}`, data);
        toast.success('Kullanıcı güncellendi.');
      } else {
        await api.post('/auth/register', data);
        toast.success('Kullanıcı oluşturuldu.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const openResetModal = (user) => {
    setResetTarget(user);
    setResetMode('auto');
    setResetManualPwd('');
    setResetResult(null);
    setResultPwdVisible(false);
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetResult(null);
    setResetManualPwd('');
    setResultPwdVisible(false);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetMode === 'manual' && !isPasswordValid(resetManualPwd)) {
      toast.error('Manuel şifre kurumsal şifre kurallarına uymuyor.');
      return;
    }
    setResetLoading(true);
    try {
      const payload = resetMode === 'manual' ? { sifre: resetManualPwd } : {};
      const { data } = await api.post(`/users/${resetTarget.id}/reset-password`, payload);
      setResetResult({
        user: resetTarget,
        gecici_sifre: data.gecici_sifre,
        mail_gonderildi: data.mail_gonderildi,
      });
      toast.success('Geçici şifre oluşturuldu.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Şifre sıfırlanamadı.');
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Panoya kopyalandı.');
    } catch {
      toast.error('Kopyalanamadı. Elle seçip kopyalayın.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kullanıcıyı pasife almak istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Kullanıcı pasife alındı.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const rolColors = {
    'IT Müdürü': 'bg-purple-100 text-purple-700',
    'IT Destek': 'bg-blue-100 text-blue-700',
    'Satınalma': 'bg-amber-100 text-amber-700',
    'Personel': 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam <span className="font-semibold text-gray-700">{filteredItems.length}</span> / {items.length} kullanıcı
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Yeni Kullanıcı
        </button>
      </div>

      <div className="card mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Ad, soyad veya email ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select-field md:w-48">
          <option value="">Tüm Roller</option>
          <option value="IT Müdürü">IT Müdürü</option>
          <option value="IT Destek">IT Destek</option>
          <option value="Satınalma">Satınalma</option>
          <option value="Personel">Personel</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Ad Soyad</th>
                <th className="table-header">E-posta</th>
                <th className="table-header">Departman</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Durum</th>
                <th className="table-header">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{item.ad} {item.soyad}</td>
                  <td className="table-cell">{item.email}</td>
                  <td className="table-cell">{item.departman_adi || '-'}</td>
                  <td className="table-cell">
                    <span className={`badge ${rolColors[item.rol_adi]}`}>{item.rol_adi}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${item.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="icon-btn text-blue-600 hover:bg-blue-50" title="Düzenle">
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      {item.aktif ? (
                        <>
                          <button
                            onClick={() => openResetModal(item)}
                            className="icon-btn text-amber-600 hover:bg-amber-50"
                            title="Şifre Sıfırla"
                          >
                            <HiOutlineKey className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="icon-btn text-red-600 hover:bg-red-50" title="Pasife Al">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
              <input className="input-field" value={form.ad} onChange={e => setForm({...form, ad: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
              <input className="input-field" value={form.soyad} onChange={e => setForm({...form, soyad: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre {editing && <span className="text-gray-400">(boş bırakılırsa değişmez)</span>}
            </label>
            <div className="relative">
              <input
                type={formPwdVisible ? 'text' : 'password'}
                className="input-field pr-10"
                value={form.sifre}
                onChange={e => setForm({ ...form, sifre: e.target.value })}
                autoComplete="new-password"
                {...(!editing && { required: true, minLength: 8 })}
              />
              <button
                type="button"
                onClick={() => setFormPwdVisible((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                title={formPwdVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-label={formPwdVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                tabIndex={-1}
              >
                {formPwdVisible ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
            {(form.sifre || !editing) && <PasswordStrength password={form.sifre} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departman</label>
              <select className="select-field" value={form.departman_id} onChange={e => setForm({...form, departman_id: e.target.value})}>
                <option value="">Seçiniz...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.departman_adi}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="select-field" value={form.rol_id} onChange={e => setForm({...form, rol_id: e.target.value})} required>
                <option value="">Seçiniz...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.rol_adi}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Güncelle' : 'Oluştur'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(resetTarget)}
        onClose={() => !resetLoading && closeResetModal()}
        title={resetResult ? 'Geçici Şifre Oluşturuldu' : 'Şifre Sıfırla'}
      >
        {resetTarget && !resetResult && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <HiOutlineExclamation className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <strong className="block">{resetTarget.ad} {resetTarget.soyad}</strong>
                <span className="text-amber-700">{resetTarget.email}</span>
                <p className="mt-1 text-amber-700">
                  Kullanıcının mevcut şifresi geçersiz kılınacak. Geçici şifre tek seferlik size gösterilecek ve
                  kullanıcı ilk girişte kendi şifresini belirlemek zorunda kalacak.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="resetMode"
                  value="auto"
                  checked={resetMode === 'auto'}
                  onChange={() => setResetMode('auto')}
                  className="mt-0.5 accent-primary-600"
                />
                <div>
                  <div className="font-medium text-gray-800">Otomatik geçici şifre üret</div>
                  <div className="text-xs text-gray-500">12 karakterli, güçlü ve okunabilir bir şifre üretilir (önerilir).</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="resetMode"
                  value="manual"
                  checked={resetMode === 'manual'}
                  onChange={() => setResetMode('manual')}
                  className="mt-0.5 accent-primary-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Manuel şifre belirle</div>
                  <div className="text-xs text-gray-500 mb-2">
                    Kurumsal şifre kurallarına uymalı. Kullanıcı ilk girişte yine de değiştirmek zorunda kalacak.
                  </div>
                  <input
                    type="text"
                    disabled={resetMode !== 'manual'}
                    value={resetManualPwd}
                    onChange={(e) => setResetManualPwd(e.target.value)}
                    placeholder="Geçici şifre..."
                    className="input-field disabled:opacity-50"
                  />
                  {resetMode === 'manual' && <PasswordStrength password={resetManualPwd} />}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeResetModal} className="btn-secondary" disabled={resetLoading}>İptal</button>
              <button type="submit" className="btn-primary" disabled={resetLoading}>
                {resetLoading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </button>
            </div>
          </form>
        )}

        {resetResult && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <HiOutlineShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <strong className="block">{resetResult.user.ad} {resetResult.user.soyad}</strong>
                <span className="text-emerald-700">{resetResult.user.email}</span>
                <p className="mt-1 text-emerald-700">
                  Bu şifre SADECE BİR KEZ gösterilir. Pencereyi kapattığınızda bir daha görüntüleyemezsiniz.
                  Kullanıcıya telefon/yüz yüze gibi güvenli bir kanaldan iletin.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Geçici şifre
              </label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 relative">
                  <input
                    readOnly
                    type={resultPwdVisible ? 'text' : 'password'}
                    value={resetResult.gecici_sifre}
                    className="input-field pr-10 font-mono tracking-wider text-lg"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => setResultPwdVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                    title={resultPwdVisible ? 'Gizle' : 'Göster'}
                  >
                    {resultPwdVisible ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resetResult.gecici_sifre)}
                  className="btn-secondary inline-flex items-center gap-1.5"
                  title="Kopyala"
                >
                  <HiOutlineClipboardCopy className="w-4 h-4" /> Kopyala
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {resetResult.mail_gonderildi
                  ? 'Bilgilendirme e-postası da kullanıcıya gönderildi.'
                  : 'E-posta gönderilmedi (SMTP yapılandırılmamış). Şifreyi kullanıcıya manuel iletmeniz gerekiyor.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={closeResetModal} className="btn-primary">Tamam, Kapat</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
