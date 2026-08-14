import { useEffect, useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LeadGenerator from './pages/LeadGenerator';
import CommercialSuite from './pages/CommercialSuite';
import Login from './pages/Login';
import { ToastContext } from './hooks/useToast';
import { AuthProvider } from './hooks/useAuth';

export default function App() {
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <AuthProvider>
      <ToastContext.Provider value={setToast}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout toast={toast} />}>
            <Route path="/" element={<Navigate to="/lead-generator" replace />} />
            <Route path="/lead-generator" element={<LeadGenerator />} />
            <Route path="/commercial-suite" element={<CommercialSuite />} />
            <Route path="*" element={<Navigate to="/lead-generator" replace />} />
          </Route>
        </Routes>
      </ToastContext.Provider>
    </AuthProvider>
  );
}
