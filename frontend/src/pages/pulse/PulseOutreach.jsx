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
      toast('Smartlead campaign queued');
    } catch (err) {
      toast(err.message);
    }
  }

  async function launchHeyReach() {
    try {
      const data = await api.pulseHeyReach({ leads });
      setMessage(data.message);
      toast('HeyReach campaign queued');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Outreach Campaigns</h1>
        <p>Smartlead email sequences · HeyReach LinkedIn DMs · n8n orchestration</p>
      </header>
      <section className="pulse-card">
        <h2>Launch sample campaign</h2>
        <p className="muted">{leads.length} sample leads loaded from Pulse inventory</p>
        <label>
          Smartlead product track
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="REACH">Practo Reach sequence</option>
            <option value="PRIME">Practo Prime sequence</option>
          </select>
        </label>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn" onClick={launchSmartlead}>
            Push to Smartlead
          </button>
          <button type="button" className="pulse-btn navy" onClick={launchHeyReach}>
            Launch HeyReach LinkedIn
          </button>
        </div>
        {message ? <p className="pulse-banner">{message}</p> : null}
      </section>
    </div>
  );
}
