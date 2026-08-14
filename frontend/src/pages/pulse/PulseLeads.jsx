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

const PAGE_SIZE = 40;

function exportRows(rows, criteria, format) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const base = `leads-${criteria.city || 'all'}-${criteria.zone || 'all'}-${stamp}`.replace(
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
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
    keyword: '',
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
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const searchSeq = useRef(0);

  const zones = useMemo(() => meta.zonesByCity[criteria.city] || [], [meta, criteria.city]);
  const keywords = useMemo(() => {
    if (!criteria.city) return meta.keywords || meta.specialties || [];
    if (criteria.zone && criteria.zone !== 'All') {
      return meta.keywordsByCityZone[`${criteria.city}||${criteria.zone}`] || [];
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
          : data.cities?.[0] || '';
        const cityKeywords =
          data.keywordsByCity?.[city] || data.keywords || data.specialties || [];
        const keyword = cityKeywords.includes('General Dentistry')
          ? 'General Dentistry'
          : cityKeywords[0] || '';
        const cityZones = data.zonesByCity?.[city] || [];
        const defaultZone = cityZones.includes('Vijayanagar') ? 'Vijayanagar' : 'All';
        setCriteria({
          city,
          zone: defaultZone,
          keyword,
          product: 'BOTH',
        });
        if (data.autopilotLevels?.length) setAutopilotLevel('sequence');
        setReady(true);
      })
      .catch((err) => toast(err.message));
  }, [toast]);

  const runDiscover = useCallback(
    async (nextCriteria = criteria, { fullScan = false } = {}) => {
      if (!nextCriteria.city || !nextCriteria.keyword) return;
      const seq = ++searchSeq.current;
      setBusy(true);
      setScanStep(
        fullScan
          ? `Full scan — Practo.com + maps for ${nextCriteria.keyword}…`
          : `Loading authentic clinics for ${nextCriteria.keyword}…`
      );
      setMessage('');
      try {
        const data = await api.pulseDiscover({
          city: nextCriteria.city,
          zone: nextCriteria.zone || 'All',
          keyword: nextCriteria.keyword,
          specialty: nextCriteria.keyword,
          product: nextCriteria.product || 'BOTH',
          live: true,
          maxLocalities: fullScan ? 24 : 10,
          limit: fullScan ? 150 : 40,
          fullScan,
        });
        if (seq !== searchSeq.current) return;
        setLeads(data.leads || []);
        setSummary(data.summary || null);
        setScannedSources(data.scannedSources || []);
        setQueryInfo(data.query || null);
        setSelected({});
        setPage(1);
        setMessage(data.message || `Found ${data.leads?.length || 0} leads`);
        const n = data.leads?.length || 0;
        toast(
          n
            ? `Found ${n} authentic leads · classified for Reach / Prime`
            : 'No live clinics found — try another zone or Refresh'
        );
      } catch (err) {
        if (seq !== searchSeq.current) return;
        setLeads([]);
        setSummary(null);
        setMessage(err.message || 'Discovery failed');
        toast(err.message);
      } finally {
        if (seq === searchSeq.current) {
          setBusy(false);
          setScanStep('');
        }
      }
    },
    [criteria, toast]
  );

  useEffect(() => {
    if (!busy) {
      setScanElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const t = setInterval(() => setScanElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (!ready || !criteria.city || !criteria.keyword) return undefined;
    const t = setTimeout(() => runDiscover(criteria), 320);
    return () => clearTimeout(t);
  }, [ready, criteria.city, criteria.zone, criteria.keyword, criteria.product]);

  function updateCity(city) {
    const cityKeywords = meta.keywordsByCity[city] || meta.keywords || [];
    const keyword = cityKeywords.includes(criteria.keyword)
      ? criteria.keyword
      : cityKeywords.includes('General Dentistry')
        ? 'General Dentistry'
        : cityKeywords[0] || '';
    setCriteria({ ...criteria, city, zone: 'All', keyword });
  }

  function updateZone(zone) {
    const nextKeywords =
      zone && zone !== 'All'
        ? meta.keywordsByCityZone[`${criteria.city}||${zone}`] || []
        : meta.keywordsByCity[criteria.city] || [];
    const keyword = nextKeywords.includes(criteria.keyword)
      ? criteria.keyword
      : nextKeywords[0] || criteria.keyword;
    setCriteria({ ...criteria, zone, keyword });
  }

  const filtered = useMemo(() => {
    const q = textFilter.trim().toLowerCase();
    return leads.filter((l) => {
      if (productFilter === 'REACH' && l.recommendedProduct === 'PRIME') return false;
      if (productFilter === 'PRIME' && l.recommendedProduct === 'REACH') return false;
      if (q) {
        const blob = [l.clinicName, l.doctorName, l.locality, l.zone, l.phone, l.email, l.specialty]
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [leads, textFilter, productFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const selectedLeads = leads.filter((l) => selected[l.id]);
  const selectedCount = selectedLeads.length;

  function toggleAll(rows) {
    if (rows.every((r) => selected[r.id])) {
      const next = { ...selected };
      rows.forEach((r) => {
        delete next[r.id];
      });
      setSelected(next);
      return;
    }
    const next = { ...selected };
    rows.forEach((r) => {
      next[r.id] = true;
    });
    setSelected(next);
  }

  async function importSelected() {
    const raw = selectedLeads.map((l) => l.raw || l).filter(Boolean);
    if (!raw.length) {
      toast('Select at least one clinic');
      return;
    }
    setBusy(true);
    try {
      const data = await api.importLeads(raw);
      toast(
        `Saved ${data.imported} lead(s)` +
          (data.skipped ? ` · skipped ${data.skipped} duplicates` : '')
      );
      setSelected({});
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pushAutopilot(leadsToPush = selectedLeads) {
    if (!leadsToPush.length) {
      toast('Select leads to push to AI Autopilot');
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
      productFit: r.recommendedProduct || '',
      leadScore: r.leadScore ?? '',
      practo: r.practoProfileStatus || '',
      discoverySource: r.discoverySource || '',
    }));
    if (!rows.length) {
      toast('No leads to export');
      return;
    }
    exportRows(rows, criteria, format);
    toast(`Exported ${rows.length} as ${format.toUpperCase()}`);
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>Lead Engine</h1>
          <p>
            Unified Lead Finder + Generator — City → Zone → Specialty from Practo.com, product-fit
            classify, then push to AI Autopilot.
          </p>
        </div>
        <span className="pulse-chip">{filtered.length} shown</span>
      </header>

      <section className="pulse-filters">
        <label>
          City
          <select value={criteria.city} onChange={(e) => updateCity(e.target.value)}>
            {(meta.cities || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zone
          <select value={criteria.zone} onChange={(e) => updateZone(e.target.value)}>
            <option value="All">All mapped zones</option>
            {zones.map((z) => {
              const count = meta.zoneMetaByCity?.[criteria.city]?.[z]?.localityCount;
              return (
                <option key={z} value={z}>
                  {z}
                  {count ? ` (${count})` : ''}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Specialty
          <select
            value={criteria.keyword}
            onChange={(e) => setCriteria({ ...criteria, keyword: e.target.value })}
          >
            {keywords.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product fit
          <select
            value={criteria.product}
            onChange={(e) => {
              setCriteria({ ...criteria, product: e.target.value });
              setProductFilter(e.target.value);
            }}
          >
            <option value="BOTH">Both Reach &amp; Prime</option>
            <option value="REACH">Practo Reach</option>
            <option value="PRIME">Practo Prime</option>
          </select>
        </label>
        <label>
          Autopilot level
          <select value={autopilotLevel} onChange={(e) => setAutopilotLevel(e.target.value)}>
            <option value="assist">Assist</option>
            <option value="sequence">Sequence</option>
            <option value="full">Full auto</option>
          </select>
        </label>
      </section>

      <div className="pulse-actions" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="pulse-btn"
          disabled={busy}
          onClick={() => runDiscover(criteria)}
        >
          {busy ? 'Discovering…' : 'Refresh authentic leads'}
        </button>
        <button
          type="button"
          className="pulse-btn ghost"
          disabled={busy}
          onClick={() => runDiscover(criteria, { fullScan: true })}
        >
          Full scan
        </button>
        <button type="button" className="pulse-btn ghost" disabled={busy} onClick={() => doExport('csv')}>
          Export CSV
        </button>
        <button
          type="button"
          className="pulse-btn ghost"
          disabled={busy || !selectedCount}
          onClick={importSelected}
        >
          Save selected ({selectedCount})
        </button>
        <button
          type="button"
          className="pulse-btn navy"
          disabled={busy || !selectedCount}
          onClick={() => pushAutopilot()}
        >
          Push to AI Autopilot ({selectedCount})
        </button>
      </div>

      <div className="muted" style={{ marginBottom: 10, fontSize: '0.85rem' }}>
        {busy && scanStep
          ? `${scanStep}${scanElapsed ? ` (${scanElapsed}s)` : ''}`
          : `Live sources: ${(scannedSources.length ? scannedSources : meta.platforms || [])
              .map((p) => p.name || p)
              .slice(0, 8)
              .join(' · ') || 'Practo · maps'}`}
      </div>

      {summary ? (
        <div className="pulse-actions" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="pulse-chip">{summary.total ?? leads.length} unique</span>
          <span className="pulse-chip">Practo {summary.withPractoProfile ?? 0}</span>
          <span className="pulse-chip">Dupes removed {summary.duplicatesRemoved || 0}</span>
          {summary.localitiesCovered ? (
            <span className="pulse-chip">{summary.localitiesCovered} localities</span>
          ) : null}
        </div>
      ) : null}

      {queryInfo?.localitiesScanned?.length ? (
        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>
          Localities: {queryInfo.localitiesScanned.slice(0, 14).join(' · ')}
          {queryInfo.localitiesScanned.length > 14 ? ' …' : ''}
        </p>
      ) : null}

      {message ? <div className="pulse-banner">{message}</div> : null}

      <div className="pulse-filters" style={{ marginBottom: 12 }}>
        <label>
          Search
          <input
            type="search"
            placeholder="Name, phone, locality…"
            value={textFilter}
            onChange={(e) => {
              setTextFilter(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Filter product
          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="BOTH">All fits</option>
            <option value="REACH">Reach</option>
            <option value="PRIME">Prime</option>
          </select>
        </label>
      </div>

      <div className="pulse-table-wrap">
        <table className="pulse-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every((r) => selected[r.id])}
                  onChange={() => toggleAll(pageRows)}
                />
              </th>
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
                  {lead.phone ? <div className="muted">{lead.phone}</div> : null}
                </td>
                <td>{lead.specialty}</td>
                <td>
                  {lead.locality || lead.zone}
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
                  <button type="button" className="navy" onClick={() => pushSmartlead(lead)}>
                    Smartlead
                  </button>
                  <button type="button" onClick={() => pushAutopilot([lead])}>
                    Autopilot
                  </button>
                </td>
              </tr>
            ))}
            {!pageRows.length ? (
              <tr>
                <td colSpan={8} className="empty">
                  {busy
                    ? 'Discovering authentic clinics…'
                    : 'No leads yet. Pick City → Zone → Specialty and wait for live discovery.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="pulse-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="muted">
            Page {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
