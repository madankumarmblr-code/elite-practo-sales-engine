import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const DEFAULT_META = {
  cities: [],
  zonesByCity: {},
  zoneMetaByCity: {},
  keywordsByCity: {},
  keywordsByCityZone: {},
  keywords: [],
  specialties: [],
  platforms: [],
  autopilotLevels: [],
};

const PAGE_SIZE = 30;

function exportRows(rows, criteria, format) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const base = `practo-leads-${criteria.city || 'all'}-${criteria.zone || 'all'}-${stamp}`.replace(
    /\s+/g,
    '_'
  );
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join(
    '\n'
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PulseLeads() {
  const toast = useToast();
  const [meta, setMeta] = useState(DEFAULT_META);
  const [criteria, setCriteria] = useState({
    city: '',
    zone: 'All',
    keyword: 'All',
    product: 'BOTH',
  });
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scannedSources, setScannedSources] = useState([]);
  const [queryInfo, setQueryInfo] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanElapsed, setScanElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [autopilotLevel, setAutopilotLevel] = useState('sequence');
  const [textFilter, setTextFilter] = useState('');
  const [productFilter, setProductFilter] = useState('BOTH');
  const [practoFilter, setPractoFilter] = useState('all'); // all | yes | no
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const searchSeq = useRef(0);

  const zones = useMemo(() => {
    const list = meta.zonesByCity[criteria.city] || [];
    return list;
  }, [meta, criteria.city]);

  const keywords = useMemo(() => {
    if (!criteria.city) return meta.keywords || meta.specialties || [];
    if (criteria.zone && criteria.zone !== 'All') {
      const czList = meta.keywordsByCityZone[`${criteria.city}||${criteria.zone}`];
      if (czList && czList.length) return czList;
    }
    return meta.keywordsByCity[criteria.city] || meta.keywords || meta.specialties || [];
  }, [meta, criteria.city, criteria.zone]);

  useEffect(() => {
    api
      .pulseMeta()
      .then((data) => {
        setMeta({ ...DEFAULT_META, ...data });
        const city = data.cities?.includes('Bangalore')
          ? 'Bangalore'
          : data.cities?.[0] || 'Bangalore';
        const cityKeywords =
          data.keywordsByCity?.[city] || data.keywords || data.specialties || [];
        const keyword = cityKeywords.includes('General Dentistry')
          ? 'General Dentistry'
          : cityKeywords[0] || 'All';
        const cityZones = data.zonesByCity?.[city] || [];
        const defaultZone = cityZones.includes('Indiranagar') ? 'Indiranagar' : 'All';

        const initialCriteria = {
          city,
          zone: defaultZone,
          keyword,
          product: 'BOTH',
        };
        setCriteria(initialCriteria);
        if (data.autopilotLevels?.length) setAutopilotLevel('sequence');
        setReady(true);
        runDiscover(initialCriteria);
      })
      .catch((err) => toast(err.message));
  }, [toast]);

  const runDiscover = useCallback(
    async (nextCriteria = criteria, { fullScan = false, live = true } = {}) => {
      if (!nextCriteria.city) return;
      const seq = ++searchSeq.current;
      setBusy(true);
      setScanStep(
        fullScan
          ? `Running deep scan for ${nextCriteria.city} · ${nextCriteria.zone}…`
          : `Discovering authentic clinics in ${nextCriteria.city} (${nextCriteria.zone})…`
      );
      setScanElapsed(0);
      const timer = setInterval(() => setScanElapsed((t) => t + 1), 1000);

      try {
        const payload = {
          city: nextCriteria.city,
          zone: nextCriteria.zone === 'All' ? undefined : nextCriteria.zone,
          zones: nextCriteria.zone === 'All' ? undefined : [nextCriteria.zone],
          keyword: nextCriteria.keyword === 'All' ? undefined : nextCriteria.keyword,
          keywords: nextCriteria.keyword === 'All' ? undefined : [nextCriteria.keyword],
          product: nextCriteria.product || 'BOTH',
          live,
          fullScan,
        };

        const res = await api.pulseDiscover(payload);
        if (seq !== searchSeq.current) return;

        clearInterval(timer);
        const nextLeads = res.leads || [];
        setLeads(nextLeads);
        setSummary(res.summary || null);
        setScannedSources(res.scannedSources || res.platforms || []);
        setQueryInfo(res.query || null);
        setMessage(res.message || `Discovered ${nextLeads.length} verified clinic leads`);
        setPage(1);
      } catch (err) {
        clearInterval(timer);
        if (seq === searchSeq.current) {
          setMessage(err.message || 'Discovery failed');
          toast(err.message);
        }
      } finally {
        if (seq === searchSeq.current) setBusy(false);
      }
    },
    [criteria, toast]
  );

  function updateCity(city) {
    const nextZones = meta.zonesByCity[city] || [];
    const nextZone = 'All';
    const nextKws = meta.keywordsByCity[city] || meta.keywords || [];
    const nextKw = nextKws[0] || 'All';
    const next = { ...criteria, city, zone: nextZone, keyword: nextKw };
    setCriteria(next);
    runDiscover(next);
  }

  function updateZone(zone) {
    const next = { ...criteria, zone };
    setCriteria(next);
    runDiscover(next);
  }

  function updateKeyword(keyword) {
    const next = { ...criteria, keyword };
    setCriteria(next);
    runDiscover(next);
  }

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      // Practo Presence filter
      if (practoFilter === 'yes' && !l.alreadyOnPracto) return false;
      if (practoFilter === 'no' && l.alreadyOnPracto) return false;

      // Product fit filter
      if (productFilter !== 'BOTH' && l.recommendedProduct !== productFilter) return false;

      // Text search filter
      if (textFilter.trim()) {
        const q = textFilter.toLowerCase();
        const blob = `${l.clinicName} ${l.doctorName} ${l.locality} ${l.specialty} ${l.phone} ${l.email}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [leads, practoFilter, productFilter, textFilter]);

  const kpis = useMemo(() => {
    let practoYes = 0;
    let practoNo = 0;
    let validPhones = 0;
    let highQuality = 0;

    leads.forEach((l) => {
      if (l.alreadyOnPracto) practoYes++;
      else practoNo++;
      if (l.phone && l.phone.replace(/\D/g, '').length >= 10) validPhones++;
      if ((l.leadScore || 0) >= 75) highQuality++;
    });

    return {
      total: leads.length,
      practoYes,
      practoNo,
      validPhones,
      highQuality,
    };
  }, [leads]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedLeads = leads.filter((l) => selected[l.id]);

  function toggleAll(rows) {
    if (rows.every((r) => selected[r.id])) {
      const next = { ...selected };
      rows.forEach((r) => delete next[r.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      rows.forEach((r) => {
        next[r.id] = true;
      });
      setSelected(next);
    }
  }

  async function pushAutopilot(leadsToPush = selectedLeads) {
    if (!leadsToPush.length) {
      toast('Select leads to push');
      return;
    }
    setBusy(true);
    try {
      const data = await api.pulseAutopilotPush({
        leads: leadsToPush,
        level: autopilotLevel,
      });
      setMessage(data.message || 'Pushed to Autopilot');
      setLeads((prev) =>
        prev.map((l) =>
          leadsToPush.some((x) => x.id === l.id)
            ? { ...l, status: 'AUTOPILOT_QUEUED' }
            : l
        )
      );
      toast(data.message || `Pushed ${data.pushed} lead(s)`);
      setSelected({});
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

  async function handleImportSubmit(e) {
    e.preventDefault();
    if (!importRawText.trim()) return;
    try {
      let parsed = [];
      const text = importRawText.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        const json = JSON.parse(text);
        parsed = Array.isArray(json) ? json : [json];
      } else {
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = cols[idx] || '';
            });
            parsed.push(obj);
          }
        }
      }
      if (!parsed.length) {
        toast('No valid lead rows parsed');
        return;
      }
      const normalized = parsed.map((p, idx) => ({
        id: p.id || `imported_${Date.now()}_${idx}`,
        clinicName: p.clinicName || p.clinic || p.name || 'Imported Clinic',
        doctorName: p.doctorName || p.doctor || p.contact || 'Doctor',
        phone: p.phone || p.mobile || '',
        email: p.email || '',
        city: p.city || criteria.city || 'Bangalore',
        locality: p.locality || p.zone || 'City Center',
        specialty: p.specialty || 'General Practice',
        recommendedProduct: p.recommendedProduct || p.product || 'PRIME',
        practoProfileStatus: p.practoProfileStatus || 'Claimed',
        alreadyOnPracto: p.alreadyOnPracto !== false,
        alreadyOnPractoLabel: p.alreadyOnPracto !== false ? 'YES' : 'NO',
        leadScore: Number(p.leadScore || p.score) || 75,
        status: 'NEW',
      }));

      await api.importLeads(normalized);
      setLeads((prev) => [...normalized, ...prev]);
      toast(`Successfully imported ${normalized.length} leads!`);
      setImportModalOpen(false);
      setImportRawText('');
    } catch (err) {
      toast(err.message || 'Failed to parse import data');
    }
  }

  function doExport(format) {
    const source = selectedCount ? selectedLeads : filtered;
    const rows = source.map((r) => ({
      clinicName: r.clinicName || '',
      contactName: r.doctorName || '',
      phone: r.phone || '',
      email: r.email || '',
      city: r.city || '',
      zone: r.zone || '',
      locality: r.locality || '',
      specialty: r.specialty || '',
      alreadyOnPracto: r.alreadyOnPractoLabel || (r.alreadyOnPracto ? 'YES' : 'NO'),
      practoStatus: r.practoProfileStatus || '',
      practoUrl: r.practoUrl || '',
      productFit: r.recommendedProduct || '',
      leadScore: r.leadScore ?? '',
      discoverySource: r.discoverySource || '',
    }));
    if (!rows.length) {
      toast('No leads to export');
      return;
    }
    exportRows(
      rows,
      {
        city: criteria.city,
        zone: criteria.zone || 'all',
      },
      format
    );
    toast(`Exported ${rows.length} as ${format.toUpperCase()}`);
  }

  return (
    <div className="pulse-page">
      {/* Header */}
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Unified Lead Generator</span>
          <h1>Lead Engine</h1>
          <p>
            Target City → Zone → Specialty corridors. Discover authentic clinics, detect Practo listing presence, verify phone numbers, and auto-dispatch to AI Autopilot.
          </p>
        </div>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn ghost" onClick={() => setImportModalOpen(true)}>
            📥 Import Leads (CSV/JSON)
          </button>
          <a
            href={api.getMasterExportUrl('csv')}
            download
            className="pulse-btn ghost"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            ⭐ Master 360° Export (CSV)
          </a>
          <span className="pulse-chip" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {filtered.length} leads matching
          </span>
        </div>
      </header>

      {/* KPI Overview Strip */}
      <div className="pulse-kpis" style={{ marginBottom: 18 }}>
        <div className="pulse-kpi tone-teal">
          <span>Total Discovered</span>
          <strong>{kpis.total}</strong>
          <em>unique verified clinics</em>
        </div>
        <div className="pulse-kpi tone-teal">
          <span>Already on Practo (YES)</span>
          <strong style={{ color: '#2dd4bf' }}>{kpis.practoYes}</strong>
          <em>prime / ray / claimed</em>
        </div>
        <div className="pulse-kpi tone-amber">
          <span>Not on Practo (NO)</span>
          <strong style={{ color: '#fbbf24' }}>{kpis.practoNo}</strong>
          <em>independent / unclaimed</em>
        </div>
        <div className="pulse-kpi tone-blue">
          <span>Valid +91 Mobile</span>
          <strong style={{ color: '#38bdf8' }}>{kpis.validPhones}</strong>
          <em>WhatsApp ready</em>
        </div>
        <div className="pulse-kpi tone-teal">
          <span>High Quality (&gt;75%)</span>
          <strong>{kpis.highQuality}</strong>
          <em>high conversion tier</em>
        </div>
      </div>

      {/* Modern Dropdown Filters Bar */}
      <section className="pulse-card" style={{ marginBottom: 18, padding: '16px 20px' }}>
        <div
          className="pulse-filters-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            alignItems: 'flex-end',
          }}
        >
          {/* 1. City Dropdown */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--muted, #94a3b8)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main, #e2e8f0)' }}>🏙️ City</span>
            <select
              value={criteria.city}
              onChange={(e) => updateCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                background: 'var(--surface-2, #0b1220)',
                border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              {(meta.cities || ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune']).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* 2. Zone Dropdown */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--muted, #94a3b8)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main, #e2e8f0)' }}>📍 Zone / Locality</span>
            <select
              value={criteria.zone}
              onChange={(e) => updateZone(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                background: 'var(--surface-2, #0b1220)',
                border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Zones (Whole City)</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>

          {/* 3. Specialty / Keyword Dropdown */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--muted, #94a3b8)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main, #e2e8f0)' }}>🩺 Medical Specialty</span>
            <select
              value={criteria.keyword}
              onChange={(e) => updateKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                background: 'var(--surface-2, #0b1220)',
                border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Specialties</option>
              {keywords.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          {/* 4. Product Fit */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--muted, #94a3b8)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main, #e2e8f0)' }}>📦 Product Fit</span>
            <select
              value={criteria.product}
              onChange={(e) => {
                const p = e.target.value;
                setCriteria({ ...criteria, product: p });
                setProductFilter(p);
              }}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                background: 'var(--surface-2, #0b1220)',
                border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <option value="BOTH">Both Reach &amp; Prime</option>
              <option value="PRIME">Practo Prime (Booking + Number)</option>
              <option value="REACH">Practo Reach (Sponsor Placement)</option>
            </select>
          </label>

          {/* 5. Autopilot Automation Level */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--muted, #94a3b8)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main, #e2e8f0)' }}>⚡ Autopilot Level</span>
            <select
              value={autopilotLevel}
              onChange={(e) => setAutopilotLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                background: 'var(--surface-2, #0b1220)',
                border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <option value="sequence">Sequence (WhatsApp + Email)</option>
              <option value="full">Full (AI Calls + Voice + WhatsApp)</option>
              <option value="assist">Assist (Enrich + Manual Review)</option>
            </select>
          </label>
        </div>

        {/* Discovery Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.12))', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pulse-btn"
              disabled={busy}
              onClick={() => runDiscover(criteria, { live: true })}
            >
              {busy ? 'Discovering Clinics…' : '🔍 Discover Authentic Clinics'}
            </button>
            <button
              type="button"
              className="pulse-btn ghost"
              disabled={busy}
              onClick={() => runDiscover(criteria, { fullScan: true })}
            >
              🚀 Deep Full Scan
            </button>
            <button type="button" className="pulse-btn ghost" disabled={busy} onClick={() => doExport('csv')}>
              Export CSV
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pulse-btn navy"
              disabled={busy || !selectedCount}
              onClick={() => pushAutopilot()}
            >
              Push to AI Autopilot {selectedCount ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </section>

      {/* Progress & Query Status Banner */}
      {busy && scanStep ? (
        <div className="pulse-banner" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-spinner" />
          <span>
            {scanStep} {scanElapsed ? `(${scanElapsed}s elapsed)` : ''}
          </span>
        </div>
      ) : null}

      {/* Secondary Search & Practo Presence Filters */}
      <section className="pulse-card" style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 240, margin: 0 }}>
            Search Results
            <input
              type="search"
              placeholder="Filter by clinic, doctor, locality, phone, email…"
              value={textFilter}
              onChange={(e) => {
                setTextFilter(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label style={{ minWidth: 200, margin: 0 }}>
            Already on Practo?
            <select value={practoFilter} onChange={(e) => { setPractoFilter(e.target.value); setPage(1); }}>
              <option value="all">All Clinics ({leads.length})</option>
              <option value="yes">🟢 Already on Practo ({kpis.practoYes})</option>
              <option value="no">⚪ Not on Practo / Unclaimed ({kpis.practoNo})</option>
            </select>
          </label>
        </div>
      </section>

      {/* Main Leads Table */}
      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Verified Clinic Prospects ({filtered.length})</h2>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {selectedCount ? `${selectedCount} selected` : 'Select clinics or click action buttons'}
          </span>
        </div>

        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th style={{ width: 38 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected[r.id])}
                    onChange={() => toggleAll(pageRows)}
                  />
                </th>
                <th>Clinic / Doctor</th>
                <th>Already on Practo?</th>
                <th>Specialty</th>
                <th>Locality</th>
                <th>Score</th>
                <th>Product Fit</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((lead) => (
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
                      {lead.doctorName}
                      {lead.googleRating
                        ? ` · ★ ${lead.googleRating}${lead.reviewCount ? ` (${lead.reviewCount})` : ''}`
                        : ''}
                    </div>
                    {lead.phone ? (
                      <div className="muted" style={{ color: '#2dd4bf', fontSize: '0.78rem', marginTop: 2 }}>
                        📞 {lead.phone}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {lead.alreadyOnPracto ? (
                      <div>
                        <span
                          className="pulse-status-pill ok"
                          style={{
                            background: 'rgba(45, 212, 191, 0.15)',
                            color: '#2dd4bf',
                            border: '1px solid rgba(45, 212, 191, 0.3)',
                            fontWeight: 600,
                            padding: '0.25rem 0.55rem',
                          }}
                        >
                          🟢 YES · {lead.practoProfileStatus || 'Profile ✓'}
                        </span>
                        {lead.practoUrl ? (
                          <div style={{ marginTop: 3 }}>
                            <a
                              href={lead.practoUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'underline' }}
                            >
                              Practo Profile ↗
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <span
                          className="pulse-status-pill idle"
                          style={{
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            fontWeight: 600,
                            padding: '0.25rem 0.55rem',
                          }}
                        >
                          ⚪ NO · Unclaimed
                        </span>
                        <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                          High pitch potential
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="pulse-chip">{lead.specialty || 'General'}</span>
                  </td>
                  <td>
                    <strong>{lead.locality || lead.zone}</strong>
                    <div className="muted">{lead.city}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="score" style={{ fontWeight: 700 }}>{lead.leadScore || 70}</span>
                      <div style={{ width: 36, height: 4, background: 'rgba(148, 163, 184, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${lead.leadScore || 70}%`,
                            height: '100%',
                            background: (lead.leadScore || 70) >= 80 ? '#2dd4bf' : '#38bdf8',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`pulse-fit ${String(lead.recommendedProduct || 'PRIME').toLowerCase()}`}>
                      {lead.recommendedProduct || 'PRIME'}
                    </span>
                  </td>
                  <td>
                    <span className="pulse-chip" style={{ fontSize: '0.72rem' }}>
                      {String(lead.status || 'DISCOVERED').replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="pulse-row-actions">
                    <button type="button" onClick={() => sendDeck(lead)} title="Generate Proposal Deck">
                      📄 Deck
                    </button>
                    <button
                      type="button"
                      className="pulse-btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                      onClick={() => pushAutopilot([lead])}
                      title="Trigger AI Autopilot Outreach"
                    >
                      ⚡ Pitch
                    </button>
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td colSpan={9} className="empty">
                    {busy
                      ? 'Discovering authentic clinics…'
                      : 'No leads matching current filters. Try changing Zone, Specialty, or Practo filter.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 ? (
          <div className="pulse-actions" style={{ marginTop: 14, justifyContent: 'space-between' }}>
            <button
              type="button"
              className="pulse-btn ghost"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Page {pageSafe} of {totalPages} ({filtered.length} total leads)
            </span>
            <button
              type="button"
              className="pulse-btn ghost"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        ) : null}
      </section>

      {/* Lead Import Modal */}
      {importModalOpen ? (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setImportModalOpen(false)}
        >
          <div
            className="pulse-card"
            style={{ width: 'min(580px, 94vw)', background: '#0f172a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px' }}>📥 Import Leads (CSV / JSON)</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 14 }}>
              Paste lead rows as JSON array or comma-separated CSV (headers: clinicName, doctorName, phone, email, locality, specialty).
            </p>
            <form onSubmit={handleImportSubmit}>
              <textarea
                rows={8}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder={`clinicName,doctorName,phone,email,locality,specialty\nApollo Dental,Dr. Sunita Rao,+919876543210,dr.sunita@apollo.com,Indiranagar,Dental Care\nCare Multispecialty,Dr. Amit Verma,+919811122334,amit@care.com,Koramangala,Orthopedics`}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: 14 }}
                required
              />
              <div className="pulse-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="pulse-btn ghost" onClick={() => setImportModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pulse-btn" disabled={!importRawText.trim()}>
                  Parse &amp; Import Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
