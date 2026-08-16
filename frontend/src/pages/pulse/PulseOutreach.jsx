import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseOutreach() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [product, setProduct] = useState('PRIME');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.pulseLeads().then((d) => setLeads((d.leads || []).slice(0, 5))).catch(() => {});
  }, []);

  async function launchSmartlead() {
    try {
      const data = await api.pulseSmartlead({ leads, product });
      setMessage(data.message);
      toast('Smartlead email sequence queued');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Outreach Campaigns</h1>
        <p>Smartlead cold email sequences &amp; multi-inbox drips · Native Autopilot</p>
      </header>
      <section className="pulse-card">
        <h2>Launch Outreach Campaign</h2>
        <p className="muted">{leads.length} verified clinic leads ready for automated cold email sequences</p>

        <label>
          Smartlead product track
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="REACH">Practo Reach sequence</option>
            <option value="PRIME">Practo Prime sequence</option>
          </select>
        </label>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn" onClick={launchSmartlead}>
            Push to Smartlead Sequencer
          </button>
        </div>
        {message ? <p className="pulse-banner">{message}</p> : null}
      </section>
    </div>
  );
}

