import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';

const DEFAULT_META = {
  cities: [],
  zonesByCity: {},
  zoneMetaByCity: {},
  keywordsByCity: {},
  keywordsByCityZone: {},
  localitiesByCityZone: {},
  keywords: [],
  specialties: [],
  platforms: [],
};

const PAGE_SIZE = 50;

export default function LeadGenerator() {
  const toast = useToast();
  const [meta, setMeta] = useState(DEFAULT_META);
  const [criteria, setCriteria] = useState({
    city: '',
    zone: 'All',
    keyword: '',
  });
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scannedSources, setScannedSources] = useState([]);
  const [queryInfo, setQueryInfo] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [practoFilter, setPractoFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [textFilter, setTextFilter] = useState('');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  const zones = useMemo(() => meta.zonesByCity[criteria.city] || [], [meta, criteria.city]);

  const keywords = useMemo(() => {
    if (!criteria.city) return meta.keywords || meta.specialties || [];
    if (criteria.zone && criteria.zone !== 'All') {
      return meta.keywordsByCityZone[`${criteria.city}||${criteria.zone}`] || [];
    }
    return meta.keywordsByCity[criteria.city] || meta.keywords || [];
  }, [meta, criteria.city, criteria.zone]);

  useEffect(() => {
    api
      .getLeadGeneratorMeta()
      .then((data) => {
        setMeta(data);
        const city = data.cities.includes('Bangalore') ? 'Bangalore' : data.cities[0] || '';
        const cityKeywords = data.keywordsByCity?.[city] || data.keywords || data.specialties || [];
        const keyword = cityKeywords.includes('General Dentistry')
          ? 'General Dentistry'
          : cityKeywords[0] || '';
        const cityZones = data.zonesByCity?.[city] || [];
        const defaultZone = cityZones.includes('Vijayanagar') ? 'Vijayanagar' : 'All';
        setCriteria({
          city,
          zone: defaultZone,
          keyword,
        });
        setReady(true);
      })
      .catch((e) => toast(e.message));
  }, []);

  const runDiscovery = useCallback(
    async (nextCriteria = criteria) => {
      if (!nextCriteria.city || !nextCriteria.keyword) return;
      setBusy(true);
      setScanStep('Expanding selected zone into covered localities (internal)…');
      try {
        await new Promise((r) => setTimeout(r, 120));
        setScanStep(
          `Searching clinics via sheet + OSM/GMB/website sources for ${nextCriteria.keyword}…`
        );
        const data = await api.searchLeads({
          city: nextCriteria.city,
          zone: nextCriteria.zone || 'All',
          keyword: nextCriteria.keyword,
          specialty: nextCriteria.keyword,
          live: true,
          maxLocalities: 40,
          limit: null,
        });
        setResults(data.results || []);
        setSummary(data.summary || null);
        setScannedSources(data.scannedSources || []);
        setQueryInfo(data.query || null);
        setSelected({});
        setPage(1);
        setZoneFilter('all');
        setLocalityFilter('all');
        const where =
          !nextCriteria.zone || nextCriteria.zone === 'All'
            ? `all zones in ${nextCriteria.city}`
            : `${nextCriteria.zone} (+ localities)`;
        toast(
          `Loaded ${data.count} unique leads · ${data.summary?.localitiesCovered || 0} localities · ${
            data.summary?.duplicatesRemoved || 0
          } dupes removed · ${where}`
        );
      } catch (err) {
        setResults([]);
        setSummary(null);
        toast(err.message);
      } finally {
        setBusy(false);
        setScanStep('');
      }
    },
    [criteria, toast]
  );

  useEffect(() => {
    if (!ready || !criteria.city || !criteria.keyword) return undefined;
    const t = setTimeout(() => runDiscovery(criteria), 280);
    return () => clearTimeout(t);
  }, [ready, criteria.city, criteria.zone, criteria.keyword]);

  function updateCity(city) {
    const cityKeywords = meta.keywordsByCity[city] || meta.keywords || [];
    const keyword = cityKeywords.includes(criteria.keyword)
      ? criteria.keyword
      : cityKeywords.includes('General Dentistry')
        ? 'General Dentistry'
        : cityKeywords[0] || '';
    setCriteria({
      city,
      zone: 'All',
      keyword,
    });
  }

  function updateZone(zone) {
    const nextKeywords =
      zone && zone !== 'All'
        ? meta.keywordsByCityZone[`${criteria.city}||${zone}`] || []
        : meta.keywordsByCity[criteria.city] || [];
    const keyword = nextKeywords.includes(criteria.keyword)
      ? criteria.keyword
      : nextKeywords[0] || '';
    setCriteria({ ...criteria, zone, keyword });
  }

  function toggle(id) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

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
    const leads = results.filter((r) => selected[r.id]);
    if (!leads.length) {
      toast('Select at least one clinic');
      return;
    }
    setBusy(true);
    try {
      const data = await api.importLeads(leads);
      toast(
        `Imported ${data.imported} into Lead Management` +
          (data.skipped ? ` · skipped ${data.skipped} duplicates` : '') +
          ' · open Lead Management for Hot/Warm/Skip, AI draft, Autopilot'
      );
      setSelected({});
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = textFilter.trim().toLowerCase();
    return results.filter((r) => {
      if (practoFilter === 'yes' && !r.practo?.hasProfile) return false;
      if (practoFilter === 'no' && r.practo?.hasProfile) return false;
      if (zoneFilter !== 'all' && r.zone !== zoneFilter) return false;
      if (localityFilter !== 'all' && (r.locality || r.zone) !== localityFilter) return false;
      if (platformFilter !== 'all') {
        const names = r.platformNames || r.platforms?.map((p) => p.name) || [];
        if (!names.includes(platformFilter)) return false;
      }
      if (sourceFilter !== 'all') {
        const src = r.discoverySource || '';
        if (sourceFilter === 'live') {
          if (!['nominatim', 'overpass', 'google_places'].includes(src)) return false;
        } else if (src !== sourceFilter) return false;
      }
      if (contactFilter === 'phone' && !(r.phone || r.owner?.phone)) return false;
      if (contactFilter === 'email' && !(r.email || r.owner?.email)) return false;
      if (contactFilter === 'website' && !r.website) return false;
      if (q) {
        const blob = [
          r.clinicName,
          r.owner?.name,
          r.address,
          r.locality,
          r.zone,
          r.keyword,
          r.phone,
          r.email,
        ]
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [
    results,
    practoFilter,
    zoneFilter,
    localityFilter,
    platformFilter,
    sourceFilter,
    contactFilter,
    textFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const resultZones = useMemo(() => [...new Set(results.map((r) => r.zone))].sort(), [results]);
  const resultLocalities = useMemo(
    () => [...new Set(results.map((r) => r.locality || r.zone))].sort(),
    [results]
  );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Lead Generator</h1>
          <p>
            Driven by the live Google Sheet — pick <strong>City → Zone → Speciality</strong>, then send
            clinics to <strong>Lead Management</strong> for Hot/Warm/Skip, AI drafts, and Autopilot.
          </p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => runDiscovery(criteria)}>
            Rescan
          </button>
          <button type="button" className="btn btn-primary" onClick={importSelected} disabled={busy || !selectedCount}>
            Send to Lead Management ({selectedCount})
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h2>Discovery filters</h2>
        <div className="form-grid three">
          <label className="field">
            City
            <select value={criteria.city} onChange={(e) => updateCity(e.target.value)}>
              {meta.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Zone
            <select value={criteria.zone} onChange={(e) => updateZone(e.target.value)}>
              <option value="All">All mapped zones</option>
              {zones.map((z) => {
                const count = meta.zoneMetaByCity?.[criteria.city]?.[z]?.localityCount;
                return (
                  <option key={z} value={z}>
                    {z}
                    {count ? ` (${count} localities)` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field">
            Speciality / keyword
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
        </div>
        <div className="form-grid" style={{ marginTop: '0.85rem' }}>
          <label className="field">
            How locality coverage works
            <div className="muted" style={{ fontSize: '0.85rem', lineHeight: 1.45, marginTop: 6 }}>
              Pick a zone only — the system automatically searches every locality covered under that
              zone from the internal Reach reference file (for example Bangalore → Vijayanagar also
              covers Deepanjalinagar, Chandra Layout, Nagarbhavi, and more). Live OSM / Google Places
              run automatically and results are de-duplicated before you send them to Lead Management.
              {meta.localityCount ? (
                <> Reference loaded: {meta.localityCount.toLocaleString()} localities.</>
              ) : null}
            </div>
          </label>
        </div>

        <div className="source-scan" style={{ marginTop: '1rem' }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
            {busy && scanStep
              ? scanStep
              : `Sources: Google Sheet + zone-localities.csv + ${(
                  scannedSources.length ? scannedSources : meta.platforms || []
                )
                  .map((p) => p.name || p)
                  .slice(0, 10)
                  .join(' · ')}${
                  meta.sheetSync?.lastSync
                    ? ` · Sheet sync ${new Date(meta.sheetSync.lastSync).toLocaleString()}`
                    : ''
                }`}
          </div>
          {summary ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-teal">{summary.total} unique leads</span>
              <span className="badge badge-blue">{summary.zonesCovered || 0} zone(s)</span>
              <span className="badge badge-blue">{summary.localitiesCovered || 0} localities</span>
              <span className="badge badge-green">Practo: {summary.withPractoProfile}</span>
              <span className="badge badge-coral">No Practo: {summary.withoutPractoProfile}</span>
              <span className="badge badge-gray">Dupes removed: {summary.duplicatesRemoved || 0}</span>
              <span className="badge badge-gray">Live: {summary.liveLeads || 0}</span>
            </div>
          ) : null}
          {queryInfo?.localitiesScanned?.length ? (
            <div className="muted" style={{ marginTop: 10, fontSize: '0.82rem' }}>
              Localities searched:{' '}
              {queryInfo.localitiesScanned.slice(0, 16).join(' · ')}
              {queryInfo.localitiesScanned.length > 16 ? ' …' : ''}
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ marginRight: 8 }}>
            {filtered.length} clinics
            {filtered.length !== results.length ? ` (of ${results.length})` : ''}
          </strong>
          <input
            type="search"
            placeholder="Search name, phone, locality…"
            value={textFilter}
            onChange={(e) => {
              setTextFilter(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: 180 }}
          />
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All result zones</option>
            {resultZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={localityFilter}
            onChange={(e) => {
              setLocalityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All localities</option>
            {resultLocalities.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={practoFilter}
            onChange={(e) => {
              setPractoFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Practo</option>
            <option value="yes">Has Practo</option>
            <option value="no">No Practo</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All platforms</option>
            {(meta.platforms || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All sources</option>
            <option value="live">Live OSM/Places only</option>
            <option value="sheet_locality">Sheet + locality</option>
            <option value="overpass">OSM Overpass</option>
            <option value="nominatim">Nominatim</option>
            <option value="google_places">Google Places</option>
          </select>
          <select
            value={contactFilter}
            onChange={(e) => {
              setContactFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Any contact</option>
            <option value="phone">Has phone</option>
            <option value="email">Has email</option>
            <option value="website">Has website</option>
          </select>
          <button type="button" className="btn btn-ghost" onClick={() => toggleAll(pageRows)} disabled={!pageRows.length}>
            Select page
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => toggleAll(filtered)}
            disabled={!filtered.length}
          >
            Select all loaded
          </button>
        </div>

        {busy && !results.length ? (
          <div className="empty">{scanStep || 'Discovering clinics across localities…'}</div>
        ) : !filtered.length ? (
          <div className="empty">
            No leads for these filters. Try another zone, locality, or speciality.
          </div>
        ) : (
          <>
            <div className="table-wrap discovery-table">
              <table className="data">
                <thead>
                  <tr>
                    <th />
                    <th>Clinic</th>
                    <th>Clinic owner & contact</th>
                    <th>Channel</th>
                    <th>Practo</th>
                    <th>Platforms / sources</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={() => toggle(r.id)}
                          aria-label={`Select ${r.clinicName}`}
                        />
                      </td>
                      <td>
                        <strong>{r.clinicName}</strong>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {r.keyword || r.specialty} · {r.locality || r.zone}, {r.city}
                        </div>
                        <div className="muted" style={{ fontSize: '0.78rem' }}>
                          {r.address}
                        </div>
                        {r.website ? (
                          <div style={{ fontSize: '0.78rem' }}>
                            <a href={r.website} target="_blank" rel="noreferrer">
                              Website
                            </a>
                            {r.gmbEnriched ? ' · GMB enriched' : ''}
                          </div>
                        ) : null}
                        <div className="muted" style={{ fontSize: '0.75rem' }}>
                          {r.matchReason}
                        </div>
                      </td>
                      <td>
                        <div>{r.owner?.name || r.name}</div>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {r.owner?.phone || r.phone || '—'}
                        </div>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {r.owner?.email || r.email || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-teal">{r.suggestedChannel || '—'}</span>
                        {r.channelReason ? (
                          <div className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                            {r.channelReason}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {r.practo?.hasProfile ? (
                          <a href={r.practo.url} target="_blank" rel="noreferrer">
                            Yes {r.practo.rating ? `· ${r.practo.rating}` : ''}
                          </a>
                        ) : (
                          <span className="muted">No</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(r.platforms || []).slice(0, 6).map((p) =>
                            p.url ? (
                              <a
                                key={p.name}
                                className="badge badge-gray"
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {p.name}
                              </a>
                            ) : (
                              <span key={p.name} className="badge badge-gray">
                                {p.name}
                              </span>
                            )
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                          {r.discoverySource || r.source}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="toolbar" style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <span className="muted">
                Page {pageSafe} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
