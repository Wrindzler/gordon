/**
 * Kimlik: token + kullanıcı localStorage, bootstrap’ta /auth/me ile
 * doğrulama, login/logout yöntemleri. `normalizeUser` rol alanı farklarını
 * eşitler.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/** Giriş /auth/me ve eski localStorage kayıtlarında tutarlı rol alanı */
function normalizeUser(raw) {
  if (!raw) return null;
  const rol = raw.rol ?? raw.rol_adi;
  return { ...raw, rol };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(normalizeUser(JSON.parse(savedUser)));
      } catch {
        localStorage.removeItem('user');
      }
      api.get('/auth/me')
        .then((res) => {
          const u = normalizeUser(res.data);
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  /* Sunucu yanıtı: token depolanır, state güncellenir, çağırana dönülür. */
  const login = async (email, sifre) => {
    const res = await api.post('/auth/login', { email, sifre });
    const u = normalizeUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
