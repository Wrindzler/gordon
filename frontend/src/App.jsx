/**
 * Rota ağacı: genel (login), korumalı layout altı, rol bazlı sayfa
 * sarmalayıcıları, bilinmeyen yol için köke yönlendirme, çerez bandı.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ForceChangePassword from './pages/ForceChangePassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MyAssets from './pages/MyAssets';
import Hardware from './pages/Hardware';
import Licenses from './pages/Licenses';
import Allocations from './pages/Allocations';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Departments from './pages/Departments';
import Vendors from './pages/Vendors';
import Invoices from './pages/Invoices';
import Notifications from './pages/Notifications';
import Database from './pages/Database';
import ActivityLogs from './pages/ActivityLogs';
import CookieConsent from './components/CookieConsent';

/* Oturum açıkken role göre varsayılan hedef seçilir. */
function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.rol === 'Personel') return <Navigate to="/varliklarim" />;
  if (user.rol === 'Satınalma') return <Navigate to="/lisanslar" />;
  return <Home />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/sifre-degistir"
          element={
            <PrivateRoute allowForcedChange>
              <ForceChangePassword />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DefaultRedirect />} />
          <Route path="dashboard" element={<PrivateRoute roles={['IT Müdürü']}><Dashboard /></PrivateRoute>} />
          <Route path="varliklarim" element={<PrivateRoute roles={['Personel']}><MyAssets /></PrivateRoute>} />
          <Route path="donanimlar" element={<PrivateRoute roles={['IT Müdürü', 'IT Destek']}><Hardware /></PrivateRoute>} />
          <Route path="lisanslar" element={<PrivateRoute roles={['IT Müdürü', 'IT Destek', 'Satınalma']}><Licenses /></PrivateRoute>} />
          <Route path="zimmetler" element={<PrivateRoute roles={['IT Müdürü', 'IT Destek']}><Allocations /></PrivateRoute>} />
          <Route path="arizalar" element={<PrivateRoute roles={['IT Müdürü', 'IT Destek', 'Personel']}><Tickets /></PrivateRoute>} />
          <Route path="kullanicilar" element={<PrivateRoute roles={['IT Müdürü']}><Users /></PrivateRoute>} />
          <Route path="departmanlar" element={<PrivateRoute roles={['IT Müdürü']}><Departments /></PrivateRoute>} />
          <Route path="tedarikciler" element={<PrivateRoute roles={['IT Müdürü', 'Satınalma']}><Vendors /></PrivateRoute>} />
          <Route path="faturalar" element={<PrivateRoute roles={['IT Müdürü', 'Satınalma']}><Invoices /></PrivateRoute>} />
          <Route path="bildirimler" element={<Notifications />} />
          <Route path="veritabani" element={<PrivateRoute roles={['IT Müdürü']}><Database /></PrivateRoute>} />
          <Route path="islem-loglari" element={<PrivateRoute roles={['IT Müdürü']}><ActivityLogs /></PrivateRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
