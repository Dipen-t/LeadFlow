import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Documents from './pages/Documents';
import ClientPortal from './pages/ClientPortal';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Users from './pages/Users';
import AdminLayout from './components/layout/AdminLayout';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/client-portal" element={
          <ProtectedRoute>
            <ClientPortal />
          </ProtectedRoute>
        } />

        {/* Protected Routes wrapped in AdminLayout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="clients" element={<Clients />} />
          <Route path="documents" element={<Documents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Users />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
