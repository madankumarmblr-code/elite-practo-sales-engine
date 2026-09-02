import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CrmProvider, useCrm } from './context/CrmContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ProductHub from './pages/ProductHub';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import AiPilot from './pages/AiPilot';
import Inventory from './pages/Inventory';
import AiCalls from './pages/AiCalls';
import AiWhatsApp from './pages/AiWhatsApp';
import AiMailing from './pages/AiMailing';
import Integrations from './pages/Integrations';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Privacy from './pages/Privacy';
import Settings from './pages/Settings';
import TeamManagement from './pages/TeamManagement';
import ProposalPage from './pages/ProposalPage';
import AmogaHub from './pages/AmogaHub';
import Login from './pages/Login';
import ServerStatusBar from './components/ServerStatusBar';
import { LeadDrawer } from './components/LeadDrawer';
import { LeadModal } from './components/LeadModal';
import { VoiceDialerModal } from './components/VoiceDialerModal';
import { PitchGeneratorModal } from './components/PitchGeneratorModal';
import { ToastContainer } from './components/Toast';

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    isAuthenticated,
    selectedLeadId,
    setSelectedLeadId,
    isLeadModalOpen,
    setIsLeadModalOpen,
    editingLead,
    voiceDialerLead,
    setVoiceDialerLead,
    pitchLead,
    setPitchLead,
  } = useCrm();

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Navbar
          onOpenLeadModal={() => setIsLeadModalOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          collapsed={sidebarCollapsed}
        />

        <ServerStatusBar />

        <main className="page-body">
          <Routes>
            <Route path="/" element={<ProductHub />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/aipilot" element={<AiPilot />} />
            <Route path="/ai-calls" element={<AiCalls />} />
            <Route path="/ai-whatsapp" element={<AiWhatsApp />} />
            <Route path="/ai-mailing" element={<AiMailing />} />
            <Route path="/proposal" element={<ProposalPage />} />
            <Route path="/amoga" element={<AmogaHub />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      {selectedLeadId && (
        <LeadDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          lead={editingLead}
          onClose={() => setIsLeadModalOpen(false)}
        />
      )}

      {voiceDialerLead && (
        <VoiceDialerModal
          lead={voiceDialerLead}
          onClose={() => setVoiceDialerLead(null)}
        />
      )}

      {pitchLead && (
        <PitchGeneratorModal
          lead={pitchLead}
          onClose={() => setPitchLead(null)}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <CrmProvider>
      <AppContent />
    </CrmProvider>
  );
}
