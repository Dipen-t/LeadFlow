import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/leads';
import Clients from './pages/clients';
import Documents from './pages/documents';
import ClientPortal from './pages/ClientPortal';
import Tasks from './pages/tasks';
import Settings from './pages/Settings';
import Integrations from './pages/integrations';
import Users from './pages/users';
import AdminLayout from './components/layout/AdminLayout';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'CLIENT') {
      return <Navigate to="/client-portal" replace />;
    }
    if (user.role === 'PLATFORM_ADMIN') {
      return <Navigate to="/users" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function IndexRedirect() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'PLATFORM_ADMIN') {
    return <Navigate to="/users" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/client-portal" element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientPortal />
          </ProtectedRoute>
        } />

        {/* Protected Routes wrapped in AdminLayout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={['BROKERAGE_ADMIN', 'ADVISOR']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="leads" element={<Leads />} />
          <Route path="clients" element={<Clients />} />
          <Route path="documents" element={<Documents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="users" element={
            <ProtectedRoute allowedRoles={['PLATFORM_ADMIN', 'BROKERAGE_ADMIN']}>
              <Users />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
