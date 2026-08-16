import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulsePitch() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [script, setScript] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.pulseLeads().then((d) => {
      const list = d.leads || [];
      setLeads(list);
      setLeadId(list[0]?.id || '');
    });
  }, []);

  const lead = leads.find((l) => l.id === leadId);

  async function generate() {
    if (!lead) return;
    try {
      const data = await api.pulsePitch({ lead, channel });
      setScript(data.script || '');
      setMessage(data.message || 'Generated');
      toast('Pitch collateral generated');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Pitch Deck Studio</h1>
        <p>Gamma 1-pagers · ElevenLabs voice notes · Claude scripts</p>
      </header>
      <section className="pulse-card">
        <div className="pulse-filters">
          <label>
            Lead
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.clinicName} · {l.locality}
                </option>
              ))}
            </select>
          </label>
          <label>
            Channel
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="whatsapp">💬 WhatsApp Pitch</option>
              <option value="email">✉️ Cold Email Sequence</option>
              <option value="call">📞 AI Voice Call Script</option>
            </select>
          </label>
        </div>

        {lead?.pitchHook ? <p className="pulse-hook">Hook: {lead.pitchHook}</p> : null}
        <button type="button" className="pulse-btn" onClick={generate}>
          Generate deck + script + voice note
        </button>
        {message ? <p className="pulse-banner">{message}</p> : null}
        <label>
          Claude content studio output
          <textarea rows={10} value={script} onChange={(e) => setScript(e.target.value)} />
        </label>
      </section>
    </div>
  );
}
