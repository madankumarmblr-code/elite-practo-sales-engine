import { useEffect, useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LeadGenerator from './pages/LeadGenerator';
import CommercialSuite from './pages/CommercialSuite';
import Login from './pages/Login';
import PulseLayout from './pages/pulse/PulseLayout';
import PulseDashboard from './pages/pulse/PulseDashboard';
import PulseLeads from './pages/pulse/PulseLeads';
import PulseOutreach from './pages/pulse/PulseOutreach';
import PulsePitch from './pages/pulse/PulsePitch';
import PulseMeetings from './pages/pulse/PulseMeetings';
import PulseSettings from './pages/pulse/PulseSettings';
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
            <Route path="/" element={<Navigate to="/pulse" replace />} />
            <Route path="/pulse" element={<PulseLayout />}>
              <Route index element={<PulseDashboard />} />
              <Route path="leads" element={<PulseLeads />} />
              <Route path="outreach" element={<PulseOutreach />} />
              <Route path="pitch" element={<PulsePitch />} />
              <Route path="meetings" element={<PulseMeetings />} />
              <Route path="settings" element={<PulseSettings />} />
            </Route>
            <Route path="/lead-generator" element={<LeadGenerator />} />
            <Route path="/commercial-suite" element={<CommercialSuite />} />
            <Route path="*" element={<Navigate to="/pulse" replace />} />
          </Route>
        </Routes>
      </ToastContext.Provider>
    </AuthProvider>
  );
}
