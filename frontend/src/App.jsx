import { useEffect, useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CommercialSuite from './pages/CommercialSuite';
import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';
import PulseLayout from './pages/pulse/PulseLayout';
import PulseDashboard from './pages/pulse/PulseDashboard';
import PulseLeads from './pages/pulse/PulseLeads';
import PulseOutreach from './pages/pulse/PulseOutreach';
import PulsePitch from './pages/pulse/PulsePitch';
import PulseMeetings from './pages/pulse/PulseMeetings';
import PulseSettings from './pages/pulse/PulseSettings';
import PulseStatus from './pages/pulse/PulseStatus';
import PulseAutopilot from './pages/pulse/PulseAutopilot';
import PulseValidation from './pages/pulse/PulseValidation';
import PulseCrm from './pages/pulse/PulseCrm';
import PulseCalls from './pages/pulse/PulseCalls';
import PulseWhatsApp from './pages/pulse/PulseWhatsApp';
import PulseEmail from './pages/pulse/PulseEmail';
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
              <Route path="validation" element={<PulseValidation />} />
              <Route path="crm" element={<PulseCrm />} />
              <Route path="autopilot" element={<PulseAutopilot />} />
              <Route path="calls" element={<PulseCalls />} />
              <Route path="whatsapp" element={<PulseWhatsApp />} />
              <Route path="email" element={<PulseEmail />} />
              <Route path="outreach" element={<PulseOutreach />} />
              <Route path="pitch" element={<PulsePitch />} />
              <Route path="meetings" element={<PulseMeetings />} />
              <Route path="commercial" element={<CommercialSuite />} />
              <Route path="settings" element={<PulseSettings />} />
              <Route path="status" element={<PulseStatus />} />
              <Route path="superadmin" element={<SuperAdmin />} />
            </Route>
            <Route path="/lead-generator" element={<Navigate to="/pulse/leads" replace />} />
            <Route path="/commercial-suite" element={<Navigate to="/pulse/commercial" replace />} />
            <Route path="/superadmin" element={<Navigate to="/pulse/superadmin" replace />} />
            <Route path="/users" element={<Navigate to="/pulse/superadmin" replace />} />
            <Route path="*" element={<Navigate to="/pulse" replace />} />
          </Route>
        </Routes>
      </ToastContext.Provider>
    </AuthProvider>
  );
}

