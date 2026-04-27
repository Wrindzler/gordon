/**
 * Rota koruması: yüklenme, anonim, zorunlu şifre değişikliği ve rol
 * listesi (varsa) sırayla uygulanır.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, roles, allowForcedChange = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-surface-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Zorunlu şifre değişimi: ForceChangePassword sayfası dışındaki her yerden
  // kullanıcıyı /sifre-degistir sayfasına yönlendir.
  if (
    user.sifre_degistirilmeli &&
    !allowForcedChange &&
    location.pathname !== '/sifre-degistir'
  ) {
    return <Navigate to="/sifre-degistir" replace />;
  }

  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;

  return children;
}
