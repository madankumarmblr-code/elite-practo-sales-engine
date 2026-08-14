import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function PulseDashboard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    api.pulseLeads().then((d) => setLeads(d.leads || [])).catch(() => setLeads([]));
  }, []);

  const reach = leads.filter((l) => l.recommendedProduct !== 'PRIME').length;
  const prime = leads.filter((l) => l.recommendedProduct !== 'REACH').length;
  const demos = leads.filter((l) => l.status === 'DEMO_SCHEDULED').length;

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Dashboard</h1>
        <p>PractoPulse pulse-check for Reach &amp; Prime inside sales.</p>
      </header>

      <div className="pulse-kpis">
        <div className="pulse-kpi">
          <span>Pipeline leads</span>
          <strong>{leads.length}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Reach-fit</span>
          <strong>{reach}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Prime-fit</span>
          <strong>{prime}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Demos scheduled</span>
          <strong>{demos}</strong>
        </div>
      </div>

      <div className="pulse-grid-2">
        <section className="pulse-card">
          <h2>Core products</h2>
          <div className="pulse-product">
            <strong>Practo Reach</strong>
            <p>Guaranteed impressions, locality &amp; specialty visibility, patient traffic.</p>
          </div>
          <div className="pulse-product">
            <strong>Practo Prime</strong>
            <p>Premier listing, 24×7 booking, smart virtual number, 15-min wait tech.</p>
          </div>
        </section>
        <section className="pulse-card">
          <h2>Next actions</h2>
          <div className="pulse-actions">
            <Link className="pulse-btn" to="/pulse/leads">
              Open Lead Finder
            </Link>
            <Link className="pulse-btn ghost" to="/pulse/outreach">
              Outreach
            </Link>
            <Link className="pulse-btn navy" to="/commercial-suite">
              Commercial Suite
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
