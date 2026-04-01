import { Routes, Route } from 'react-router-dom';
import BookingPage from './components/BookingPage';
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import BookingsReport from './components/admin/BookingsReport';
import SessionsManager from './components/admin/SessionsManager';
import PackagesManager from './components/admin/PackagesManager';

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<BookingPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin"   element={<AdminLayout />}>
        <Route index         element={<Dashboard />} />
        <Route path="bookings" element={<BookingsReport />} />
        <Route path="sessions" element={<SessionsManager />} />
        <Route path="packages" element={<PackagesManager />} />
      </Route>
    </Routes>
  );
}
