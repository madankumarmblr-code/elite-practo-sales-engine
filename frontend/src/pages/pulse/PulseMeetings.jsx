import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseMeetings() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState('');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.pulseLeads().then((d) => {
      const list = d.leads || [];
      setLeads(list);
      setLeadId(list[0]?.id || '');
    });
  }, []);

  const lead = leads.find((l) => l.id === leadId);

  async function bookDemo() {
    if (!lead) return;
    try {
      const start = new Date(Date.now() + 2 * 86400000);
      start.setHours(16, 0, 0, 0);
      const data = await api.pulseDemo({
        leadId: lead.id,
        title: `Practo ${lead.recommendedProduct} demo · ${lead.clinicName}`,
        startIso: start.toISOString(),
        attendeeEmail: lead.email,
      });
      setMessage(data.message);
      toast('Demo booked');
    } catch (err) {
      toast(err.message);
    }
  }

  async function pullFireflies() {
    if (!lead) return;
    try {
      const data = await api.pulseFireflies({ leadId: lead.id });
      setSummary(data.summary || '');
      setMessage(data.message);
      toast('Fireflies synced');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Meeting Hub</h1>
        <p>Google Calendar holds · Fireflies call intelligence</p>
      </header>
      <section className="pulse-card">
        <label>
          Lead
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.clinicName} · {l.status}
              </option>
            ))}
          </select>
        </label>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn" onClick={bookDemo}>
            Book GCal demo
          </button>
          <button type="button" className="pulse-btn ghost" onClick={pullFireflies}>
            Pull Fireflies summary
          </button>
        </div>
        {message ? <p className="pulse-banner">{message}</p> : null}
        {summary ? <pre className="pulse-summary">{summary}</pre> : null}
      </section>
    </div>
  );
}
