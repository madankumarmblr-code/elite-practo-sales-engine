import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const CITIES = ['Bangalore', 'Mumbai', 'Delhi-NCR', 'Hyderabad', 'Pune', 'Chennai'];
const SPECIALTIES = [
  'Dermatologist',
  'Dentist',
  'Orthopedist',
  'Pediatrician',
  'Gynecologist',
  'ENT',
  'General Physician',
  'Cardiologist',
  'Ophthalmologist',
];

export default function PulseLeads() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState({});
  const [filters, setFilters] = useState({
    city: 'Bangalore',
    locality: '',
    specialties: ['Dermatologist'],
    product: 'BOTH',
  });

  useEffect(() => {
    api
      .pulseLeads()
      .then((d) => setLeads(d.leads || []))
      .catch((err) => toast(err.message));
  }, [toast]);

  const rows = useMemo(() => {
    return leads.filter((l) => {
      if (filters.city && l.city !== filters.city) return false;
      if (
        filters.locality &&
        !`${l.locality} ${l.address || ''}`.toLowerCase().includes(filters.locality.toLowerCase())
      ) {
        return false;
      }
      if (filters.specialties.length && !filters.specialties.includes(l.specialty)) return false;
      if (filters.product === 'REACH' && l.recommendedProduct === 'PRIME') return false;
      if (filters.product === 'PRIME' && l.recommendedProduct === 'REACH') return false;
      return true;
    });
  }, [leads, filters]);

  function toggleSpecialty(spec) {
    setFilters((f) => ({
      ...f,
      specialties: f.specialties.includes(spec)
        ? f.specialties.filter((s) => s !== spec)
        : [...f.specialties, spec],
    }));
  }

  async function runSource() {
    setBusy(true);
    setMessage('');
    try {
      const data = await api.pulseSource(filters);
      setLeads(data.leads || []);
      setMessage(data.message || 'Sourcing complete');
      toast('Sourcing & enrichment complete');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendDeck(lead) {
    try {
      const data = await api.pulsePitch({ lead, channel: 'whatsapp' });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, pitchDeckUrl: data.pitchDeckUrl } : l))
      );
      setMessage(data.message || 'Deck generated');
      toast('Pitch deck generated');
    } catch (err) {
      toast(err.message);
    }
  }

  async function bookCall(lead) {
    try {
      const start = new Date(Date.now() + 86400000);
      start.setHours(11, 0, 0, 0);
      const data = await api.pulseDemo({
        leadId: lead.id,
        title: `Practo demo · ${lead.clinicName}`,
        startIso: start.toISOString(),
        attendeeEmail: lead.email,
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: 'DEMO_SCHEDULED' } : l))
      );
      setMessage(data.message || 'Demo booked');
      toast('Demo scheduled');
    } catch (err) {
      toast(err.message);
    }
  }

  async function pushSmartlead(lead) {
    try {
      const product = lead.recommendedProduct === 'REACH' ? 'REACH' : 'PRIME';
      const data = await api.pulseSmartlead({ leads: [lead], product });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: 'OUTREACH_ACTIVE' } : l))
      );
      setMessage(data.message || 'Pushed to Smartlead');
      toast('Pushed to Smartlead');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>Lead Finder</h1>
          <p>City &amp; specialty engine · Apify sourcing · Clay enrich · Claude product-fit</p>
        </div>
        <span className="pulse-chip">{rows.length} shown</span>
      </header>

      <section className="pulse-filters">
        <label>
          City
          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Locality / Zone
          <input
            placeholder="e.g. Indiranagar"
            value={filters.locality}
            onChange={(e) => setFilters({ ...filters, locality: e.target.value })}
          />
        </label>
        <label>
          Target product
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
          >
            <option value="BOTH">Both Reach &amp; Prime</option>
            <option value="REACH">Practo Reach</option>
            <option value="PRIME">Practo Prime</option>
          </select>
        </label>
        <button type="button" className="pulse-btn" disabled={busy} onClick={runSource}>
          {busy ? 'Sourcing…' : 'Run Sourcing & Enrichment via Apify'}
        </button>
      </section>

      <div className="pulse-specs">
        {SPECIALTIES.map((spec) => (
          <button
            key={spec}
            type="button"
            className={filters.specialties.includes(spec) ? 'on' : ''}
            onClick={() => toggleSpecialty(spec)}
          >
            {spec}
          </button>
        ))}
      </div>

      {message ? <div className="pulse-banner">{message}</div> : null}

      <div className="pulse-table-wrap">
        <table className="pulse-table">
          <thead>
            <tr>
              <th />
              <th>Clinic / Doctor</th>
              <th>Specialty</th>
              <th>Locality</th>
              <th>Score</th>
              <th>Product Fit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!selected[lead.id]}
                    onChange={() =>
                      setSelected((s) => ({ ...s, [lead.id]: !s[lead.id] }))
                    }
                  />
                </td>
                <td>
                  <strong>{lead.clinicName}</strong>
                  <div className="muted">
                    {lead.doctorName} · ★ {lead.googleRating} ({lead.reviewCount})
                  </div>
                </td>
                <td>{lead.specialty}</td>
                <td>
                  {lead.locality}
                  <div className="muted">{lead.city}</div>
                </td>
                <td className="score">{lead.leadScore}</td>
                <td>
                  <span className={`pulse-fit ${String(lead.recommendedProduct).toLowerCase()}`}>
                    {lead.recommendedProduct}
                  </span>
                </td>
                <td>{String(lead.status || '').replaceAll('_', ' ')}</td>
                <td className="pulse-row-actions">
                  <button type="button" onClick={() => sendDeck(lead)}>
                    Deck
                  </button>
                  <button type="button" onClick={() => bookCall(lead)}>
                    Call
                  </button>
                  <button type="button" className="navy" onClick={() => pushSmartlead(lead)}>
                    Smartlead
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="empty">
                  No leads match these filters. Run sourcing or widen specialty selection.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
