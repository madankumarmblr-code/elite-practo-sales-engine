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
    live: true,
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
          live: true,
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
          live: nextCriteria.live,
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
  }, [ready, criteria.city, criteria.zone, criteria.keyword, criteria.live]);

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
      live: criteria.live,
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

  const [draft, setDraft] = useState(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [productPitch, setProductPitch] = useState('prime');

  function selectedLeads() {
    return results.filter((r) => selected[r.id]);
  }

  function qualifySelected(temperature) {
    const ids = new Set(selectedLeads().map((r) => r.id));
    if (!ids.size) {
      toast('Select at least one clinic');
      return;
    }
    setResults((rows) =>
      rows.map((r) => {
        if (!ids.has(r.id)) return r;
        if (temperature === 'hot') {
          return { ...r, temperature: 'hot', score: Math.max(r.score || 0, 88) };
        }
        if (temperature === 'warm') {
          return { ...r, temperature: 'warm', score: Math.max(r.score || 0, 65) };
        }
        return { ...r, temperature: 'skip', score: Math.min(r.score || 0, 25) };
      })
    );
    toast(`Marked ${ids.size} as ${temperature.toUpperCase()}`);
  }

  async function importSelected() {
    const leads = selectedLeads().filter((r) => r.temperature !== 'skip');
    if (!leads.length) {
      toast('Select at least one non-skipped clinic');
      return;
    }
    setBusy(true);
    try {
      const data = await api.importLeads(leads);
      toast(
        `Imported ${data.imported} clinics` +
          (data.skipped ? ` · skipped ${data.skipped} duplicates` : '')
      );
      setSelected({});
      return data.leads || [];
    } catch (err) {
      toast(err.message);
      return [];
    } finally {
      setBusy(false);
    }
  }

  async function draftForSelected() {
    const lead = selectedLeads()[0];
    if (!lead) {
      toast('Select one clinic to draft outreach');
      return;
    }
    setDraftBusy(true);
    try {
      const data = await api.aiDraft({
        lead: {
          name: lead.owner?.name || lead.name,
          email: lead.owner?.email || lead.email,
          phone: lead.owner?.phone || lead.phone,
          company: lead.clinicName || lead.company,
          score: lead.score,
          website: lead.website,
          practo: lead.practo,
          notes: lead.practo?.hasProfile ? 'Practo profile: Yes' : 'Practo profile: No',
          suggestedChannel: lead.suggestedChannel,
        },
        product: productPitch,
        channel: lead.suggestedChannel || undefined,
      });
      setDraft(data);
    } catch (err) {
      toast(err.message);
    } finally {
      setDraftBusy(false);
    }
  }

  async function launchAutopilot() {
    const toImport = selectedLeads().filter((r) => r.temperature !== 'skip');
    if (!toImport.length) {
      toast('Select Hot/Warm clinics to launch Autopilot');
      return;
    }
    setBusy(true);
    try {
      const data = await api.importLeads(toImport);
      const leadIds = (data.leads || []).map((l) => l.id);
      if (!leadIds.length) {
        toast('Nothing imported (duplicates?) — cannot launch Autopilot');
        return;
      }
      const run = await api.runAutopilotForLeads({
        leadIds,
        mode: 'dry_run',
        product: productPitch,
      });
      toast(
        `${run.message} · imported ${data.imported}` +
          (data.skipped ? ` · skipped ${data.skipped} dupes` : '')
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
            Driven by the live Google Sheet — pick <strong>City → Zone → Speciality</strong>. The system
            internally expands each zone into covered localities, searches Maps / GMB / websites / OSM,
            and returns <strong>deduped</strong> clinic leads.
          </p>
        </div>
        <div className="topbar-actions" style={{ flexWrap: 'wrap' }}>
          <select
            value={productPitch}
            onChange={(e) => setProductPitch(e.target.value)}
            title="Product pitch for AI drafts / Autopilot"
          >
            <option value="prime">Prime</option>
            <option value="reach">Reach</option>
            <option value="video">Video</option>
            <option value="prime_reach">Prime + Reach</option>
            <option value="full_suite">Full suite</option>
          </select>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => runDiscovery(criteria)}>
            Rescan
          </button>
          <button type="button" className="btn btn-ghost" disabled={!selectedCount} onClick={() => qualifySelected('hot')}>
            Hot
          </button>
          <button type="button" className="btn btn-ghost" disabled={!selectedCount} onClick={() => qualifySelected('warm')}>
            Warm
          </button>
          <button type="button" className="btn btn-ghost" disabled={!selectedCount} onClick={() => qualifySelected('skip')}>
            Skip
          </button>
          <button type="button" className="btn btn-secondary" disabled={draftBusy || !selectedCount} onClick={draftForSelected}>
            {draftBusy ? 'Drafting…' : 'AI draft'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy || !selectedCount} onClick={launchAutopilot}>
            Autopilot selected
          </button>
          <button type="button" className="btn btn-primary" onClick={importSelected} disabled={busy || !selectedCount}>
            Import selected ({selectedCount})
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
        <div className="form-grid three" style={{ marginTop: '0.85rem' }}>
          <label className="field">
            Live sources (OSM / Places)
            <select
              value={criteria.live ? '1' : '0'}
              onChange={(e) => setCriteria({ ...criteria, live: e.target.value === '1' })}
            >
              <option value="1">On — pull OSM + optional Google Places</option>
              <option value="0">Off — sheet + locality inventory only</option>
            </select>
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Free OSM Nominatim/Overpass run automatically. Add Google Places key in API Integrations
              for GMB-quality pulls.
            </span>
          </label>
          <label className="field" style={{ gridColumn: 'span 2' }}>
            How locality coverage works
            <div className="muted" style={{ fontSize: '0.85rem', lineHeight: 1.45, marginTop: 6 }}>
              Pick a zone only — the system automatically searches every locality covered under that
              zone from the internal Reach reference file (for example Bangalore → Vijayanagar also
              covers Deepanjalinagar, Chandra Layout, Nagarbhavi, and more).
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
            No leads for these filters. Try another zone/locality/speciality, or turn live sources on.
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
                    <th>Qualify</th>
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
                        {r.temperature ? (
                          <span
                            className={`badge ${
                              r.temperature === 'hot'
                                ? 'badge-coral'
                                : r.temperature === 'warm'
                                  ? 'badge-teal'
                                  : 'badge-gray'
                            }`}
                          >
                            {r.temperature}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
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

      {draft ? (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h2>AI outreach draft</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {draft.channelLabel} · {draft.productLabel}
              {draft.aiUsed ? ` · ${draft.aiNote}` : ` · ${draft.aiNote}`}
            </p>
            <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
              Smart pick: {(draft.smartPick?.reasons || []).join(' · ')}
            </div>
            {draft.subject ? (
              <label className="field">
                Subject
                <input readOnly value={draft.subject} />
              </label>
            ) : null}
            <label className="field">
              Message
              <textarea readOnly rows={10} value={draft.body} />
            </label>
            {draft.steps?.length ? (
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Steps: {draft.steps.join(' → ')}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    [draft.subject, draft.body].filter(Boolean).join('\n\n')
                  );
                  toast('Draft copied');
                }}
              >
                Copy
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDraft(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
