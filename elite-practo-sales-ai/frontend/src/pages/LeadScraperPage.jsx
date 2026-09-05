import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { DEFAULT_REACH_SLOTS } from '../constants/reachSlots.js';
import { EnterpriseIcon } from '../components/EnterpriseIcon.jsx';

export default function LeadScraperPage() {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [constituentLocalities, setConstituentLocalities] = useState([]);
  const [specialities, setSpecialities] = useState([]);

  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [selectedZone, setSelectedZone] = useState('Indiranagar');
  const [selectedSubLocality, setSelectedSubLocality] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('General Physician');

  const [clinics, setClinics] = useState([]);
  const [stats, setStats] = useState({ total: 0, availableOnPracto: 0, notOnPracto: 0 });
  const [filterPracto, setFilterPracto] = useState('all'); // 'all' | 'on_practo' | 'not_on_practo'
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState(null);

  // Modal for Autopilot assignment
  const [assignModal, setAssignModal] = useState(false);
  const [assignType, setAssignType] = useState('autopilot'); // 'autopilot' | 'manual'
  const [assignProduct, setAssignProduct] = useState('reach'); // 'prime' | 'reach'
  const [assigning, setAssigning] = useState(false);

  // Reach Inventory & Auto-Launch Modal State
  const [availableReachSlots, setAvailableReachSlots] = useState(DEFAULT_REACH_SLOTS);
  const [assignReachSlotId, setAssignReachSlotId] = useState(DEFAULT_REACH_SLOTS[0].slotId);

  const [autoLaunchModal, setAutoLaunchModal] = useState(false);
  const [autoLaunchProduct, setAutoLaunchProduct] = useState('reach'); // 'reach' | 'prime' | 'all'
  const [autoLaunchReachSlotId, setAutoLaunchReachSlotId] = useState(DEFAULT_REACH_SLOTS[0].slotId);
  const [autoLaunchLimit, setAutoLaunchLimit] = useState(25);
  const [autoLaunching, setAutoLaunching] = useState(false);

  // Load available Reach inventory slots on mount
  useEffect(() => {
    api.getAvailableReachSlots({ limit: 60 })
      .then((res) => {
        const slots = res?.slots || res || [];
        setAvailableReachSlots(slots);
        if (slots.length > 0) {
          setAssignReachSlotId(slots[0].slotId);
          setAutoLaunchReachSlotId(slots[0].slotId);
        }
      })
      .catch(() => {});
  }, []);

  const selectedAssignReachSlot = availableReachSlots.find((s) => s.slotId === assignReachSlotId) || availableReachSlots[0] || null;
  const selectedAutoLaunchReachSlot = availableReachSlots.find((s) => s.slotId === autoLaunchReachSlotId) || availableReachSlots[0] || null;

  // Load cities on mount from Google Sheet hierarchy
  useEffect(() => {
    (api.getScraperCities ? api.getScraperCities() : api.getInventoryCities())
      .then((c) => {
        const cityList = c || [];
        setCities(cityList);
        if (cityList.length && !cityList.includes(selectedCity)) {
          setSelectedCity(cityList.includes('Bangalore') ? 'Bangalore' : cityList[0]);
        }
      })
      .catch(() => {
        api.getInventoryCities().then((c) => setCities(c || [])).catch(() => {});
      });
  }, []); // eslint-disable-line

  // Cascading: when City changes, fetch Zones from Google Sheet
  useEffect(() => {
    if (!selectedCity) { setZones([]); return; }
    (api.getScraperZones ? api.getScraperZones(selectedCity) : api.getInventoryZones(selectedCity))
      .then((z) => {
        const zoneList = z || [];
        setZones(zoneList);
        if (zoneList.length > 0) {
          if (!zoneList.includes(selectedZone)) setSelectedZone(zoneList.includes('Indiranagar') ? 'Indiranagar' : zoneList[0]);
        } else {
          setSelectedZone('');
        }
      })
      .catch(() => setZones([]));
  }, [selectedCity]); // eslint-disable-line

  // Cascading: when Zone changes, fetch constituent Localities from Google Sheet
  useEffect(() => {
    if (!selectedCity || !selectedZone) { setConstituentLocalities([]); return; }
    if (api.getScraperLocalities) {
      api.getScraperLocalities(selectedCity, selectedZone)
        .then((locs) => {
          setConstituentLocalities(locs || []);
          setSelectedSubLocality('');
        })
        .catch(() => setConstituentLocalities([]));
    }
  }, [selectedCity, selectedZone]); // eslint-disable-line

  // Cascading: when Zone changes, fetch Specialities
  useEffect(() => {
    if (!selectedCity || !selectedZone) { setSpecialities([]); return; }
    api.getInventorySpecialities(selectedCity, selectedZone)
      .then((s) => {
        setSpecialities(s || []);
        if (s && s.length > 0) {
          if (!s.includes(selectedSpec)) setSelectedSpec(s[0]);
        } else {
          setSelectedSpec('');
        }
      })
      .catch(() => setSpecialities([]));
  }, [selectedCity, selectedZone]); // eslint-disable-line

  // Search clinics (with optional live multi-source scraping refresh)
  async function handleSearch(e, forceRefresh = false) {
    if (e) e.preventDefault();
    if (!selectedCity) return;
    setLoading(true);
    setMessage(null);
    setSelectedIds([]);
    try {
      const data = await api.searchClinics({
        city: selectedCity,
        zone: selectedZone,
        locality: selectedSubLocality || selectedZone,
        searchAllZone: !selectedSubLocality ? 'true' : 'false',
        speciality: selectedSpec,
        refresh: forceRefresh ? 'true' : undefined,
      });
      setClinics(data.clinics || []);
      if (data.constituentLocalities && data.constituentLocalities.length > 0) {
        setConstituentLocalities(data.constituentLocalities);
      }
      setStats({
        total: data.totalFound ?? data.total ?? (data.clinics || []).length,
        availableOnPracto: data.onPractoCount ?? data.availableOnPracto ?? (data.clinics || []).filter((c) => c.on_practo === 1).length,
        notOnPracto: data.notOnPractoCount ?? data.notOnPracto ?? (data.clinics || []).filter((c) => c.on_practo === 0).length,
      });
      if (forceRefresh) {
        setMessage({
          type: 'success',
          text: `⚡ Multi-source live discovery complete! Scraped Practo.com, Google Maps & Clinic Websites across ${selectedSubLocality || `all ${constituentLocalities.length || ''} areas in ${selectedZone}`}.`,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Run initial search
  useEffect(() => {
    if (selectedCity && selectedZone && selectedSpec) {
      handleSearch();
    }
  }, []); // eslint-disable-line

  function toggleSelectAll() {
    if (selectedIds.length === filteredClinics.length) setSelectedIds([]);
    else setSelectedIds(filteredClinics.map((c) => c.id));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleAssignSubmit() {
    if (selectedIds.length === 0) return;
    setAssigning(true);
    try {
      const payload = {
        clinicIds: selectedIds,
        assignType,
        product: assignProduct,
      };
      if (assignType === 'autopilot' && assignProduct === 'reach') {
        payload.reachSlotId = assignReachSlotId || selectedAssignReachSlot?.slotId;
        payload.reachSlotDetails = selectedAssignReachSlot;
      }
      const res = await api.assignScrapedToCrm(payload);
      setMessage({
        type: 'success',
        text: `Successfully assigned ${res.assignedCount} clinic(s) to CRM as ${assignType === 'autopilot' ? `Auto Pilot [${assignProduct.toUpperCase()}]` : 'Manual Dialing Queue'}!`,
      });
      setAssignModal(false);
      setSelectedIds([]);
      handleSearch();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAssigning(false);
    }
  }

  async function handleAutoLaunchSubmit(e) {
    if (e) e.preventDefault();
    setAutoLaunching(true);
    setMessage(null);
    try {
      const payload = {
        limit: Number(autoLaunchLimit) || 25,
        product: autoLaunchProduct === 'all' ? undefined : autoLaunchProduct,
        autoStart: true,
      };
      if (autoLaunchProduct === 'reach') {
        payload.reachSlotId = autoLaunchReachSlotId || selectedAutoLaunchReachSlot?.slotId;
        payload.reachSlotDetails = selectedAutoLaunchReachSlot;
      }
      const res = await api.autoEnqueueScrapedToAutopilot(payload);
      setMessage({
        type: 'success',
        text: `⚡ Enqueued ${res.enqueuedCount || 0} scraped healthcare practices into 100% Full Autopilot! Voice AI calling and Reach pitch initiated.`,
      });
      setAutoLaunchModal(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAutoLaunching(false);
    }
  }

  async function handleQuickAssign(id, type, prod) {
    try {
      await api.assignScrapedToCrm({ clinicIds: [id], assignType: type, product: prod });
      setMessage({ type: 'success', text: `Assigned clinic to ${type === 'autopilot' ? `Auto Pilot [${prod.toUpperCase()}]` : 'Manual Dialing'}!` });
      handleSearch();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  const apolloCount = clinics.filter((c) => c.apollo_enriched === 1 || !!c.linkedin_url).length;
  const gmbCount = clinics.filter((c) => (c.gmb_rating > 0 || !!c.gmb_url)).length;

  const filteredClinics = clinics.filter((c) => {
    if (filterPracto === 'on_practo') return c.on_practo === 1;
    if (filterPracto === 'not_on_practo') return c.on_practo === 0;
    if (filterPracto === 'apollo') return c.apollo_enriched === 1 || !!c.linkedin_url;
    if (filterPracto === 'google_maps') return (c.gmb_rating > 0 || !!c.gmb_url);
    return true;
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <EnterpriseIcon name="search" size={24} color="#1456FD" />
            <h1 className="page-title">Clinic & Hospital Lead Scraper</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Discover verified clinics by City, Locality, and Speciality with owner & marketing contacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary btn-sm flex items-center gap-2"
            style={{ fontWeight: 700 }}
            onClick={() => setAutoLaunchModal(true)}
          >
            <EnterpriseIcon name="zap" size={14} color="#1456FD" />
            <span>Auto-Launch Autopilot (All Leads)</span>
          </button>

          {selectedIds.length > 0 && (
            <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => setAssignModal(true)}>
              <EnterpriseIcon name="zap" size={14} color="#FFFFFF" />
              <span>Push {selectedIds.length} to Autopilot</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} flex items-center gap-2`}>
          <EnterpriseIcon name={message.type === 'error' ? 'alert-triangle' : 'check-circle'} size={16} color={message.type === 'error' ? '#EF4444' : '#10B981'} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Cascading Filter Controls */}
      <div className="card mb-6" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                1. Select City ({cities.length})
              </label>
              <select className="input" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                2. Select Zone ({zones.length})
              </label>
              <select className="input" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={zones.length === 0}>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                3. Sub-Locality / Area ({constituentLocalities.length})
              </label>
              <select
                className="input"
                value={selectedSubLocality}
                onChange={(e) => setSelectedSubLocality(e.target.value)}
                disabled={constituentLocalities.length === 0}
              >
                <option value="">
                  {constituentLocalities.length > 0
                    ? `⚡ All ${constituentLocalities.length} Areas in ${selectedZone}`
                    : 'All Areas in Zone'}
                </option>
                {constituentLocalities.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                4. Speciality / Keyword ({specialities.length})
              </label>
              <select className="input" value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)} disabled={specialities.length === 0}>
                {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Google Sheet Constituent Localities Territory Banner */}
          {selectedZone && constituentLocalities.length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                <span style={{ fontWeight: 700, color: '#1E2238' }}>
                  📍 Google Sheet Territory: <strong>{selectedCity}</strong> → Zone <strong>{selectedZone}</strong>
                </span>
                <span className="badge" style={{ background: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, fontSize: 11 }}>
                  {constituentLocalities.length} Constituent Localities
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: '#475569', marginRight: 4 }}>Constituent Areas:</span>
                <span
                  onClick={() => setSelectedSubLocality('')}
                  style={{
                    display: 'inline-block',
                    margin: '2px 4px',
                    padding: '2px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: !selectedSubLocality ? '#1456FD' : '#E2E8F0',
                    color: !selectedSubLocality ? '#FFFFFF' : '#334155',
                    fontWeight: !selectedSubLocality ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                  title="Search across all areas in this zone"
                >
                  All Areas ({constituentLocalities.length})
                </span>
                {constituentLocalities.map((loc) => (
                  <span
                    key={loc}
                    onClick={() => setSelectedSubLocality(selectedSubLocality === loc ? '' : loc)}
                    style={{
                      display: 'inline-block',
                      margin: '2px 3px',
                      padding: '2px 7px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: selectedSubLocality === loc ? '#1456FD' : '#E2E8F0',
                      color: selectedSubLocality === loc ? '#FFFFFF' : '#334155',
                      fontWeight: selectedSubLocality === loc ? 700 : 500,
                      transition: 'all 0.15s ease'
                    }}
                    title={`Filter strictly for ${loc}`}
                  >
                    {loc}
                  </span>
                ))}
              </div>
              <div className="text-muted mt-1.5" style={{ fontSize: 11, fontStyle: 'italic', color: '#64748B' }}>
                {!selectedSubLocality
                  ? `⚡ Multi-Locality Zone Mode: Scraping will search across all ${constituentLocalities.length} constituent areas of ${selectedZone} (e.g., Indiranagar, Domlur, New Thippasandra, Old Airport Road, etc.) for clinics and hospitals.`
                  : `🎯 Single Locality Mode: Filtered specifically for "${selectedSubLocality}".`}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid #F1F5F9' }}>
            <div className="text-xs text-muted">
              Target Territory: <strong>{selectedCity}</strong> → <strong>{selectedZone || 'All'}</strong> {selectedSubLocality ? `(${selectedSubLocality})` : `(All ${constituentLocalities.length || 0} Areas)`} → <strong>{selectedSpec || 'All'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                disabled={loading}
              >
                <EnterpriseIcon name="search" size={13} color="#475569" />
                <span>Quick Search</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={(e) => handleSearch(e, true)}
                disabled={loading}
              >
                <EnterpriseIcon name="zap" size={13} color="#FFFFFF" />
                <span>{loading ? 'Scraping Live Web...' : 'Live Multi-Source Scrape (Practo + Google Maps + Apollo.io + Web)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Sub-header with Filter Pills */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold" style={{ color: '#1E2238' }}>Filter Presence:</span>
          <button
            className={`btn btn-sm ${filterPracto === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterPracto('all')}
          >
            All Results ({stats.total})
          </button>
          <button
            className={`btn btn-sm ${filterPracto === 'on_practo' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterPracto('on_practo')}
          >
            ✓ On Practo ({stats.availableOnPracto})
          </button>
          <button
            className={`btn btn-sm ${filterPracto === 'not_on_practo' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterPracto('not_on_practo')}
            style={filterPracto === 'not_on_practo' ? {} : { borderColor: '#FED7AA', color: '#C2410C' }}
          >
            ⭐ Unlisted Target ({stats.notOnPracto})
          </button>
          <button
            className={`btn btn-sm ${filterPracto === 'google_maps' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterPracto('google_maps')}
            style={filterPracto === 'google_maps' ? {} : { borderColor: '#BAE6FD', color: '#0284C7' }}
          >
            🗺️ Google Maps ({gmbCount})
          </button>
          <button
            className={`btn btn-sm ${filterPracto === 'apollo' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterPracto('apollo')}
            style={filterPracto === 'apollo' ? {} : { borderColor: '#E9D5FF', color: '#7E22CE' }}
          >
            ⚡ Apollo.io Enriched ({apolloCount})
          </button>
        </div>

        {filteredClinics.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.length === filteredClinics.length && filteredClinics.length > 0}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="select-all" className="text-xs font-bold text-secondary" style={{ cursor: 'pointer' }}>
              Select All {filteredClinics.length}
            </label>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Scraping clinics in {selectedCity} ({selectedZone})...</p>
          </div>
        ) : filteredClinics.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏥</div>
            <h3 className="section-title">No Clinics Found</h3>
            <p className="text-sm text-muted mt-1">Try selecting a different locality or speciality above.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Clinic / Hospital</th>
                  <th>Practo & Discovery Status</th>
                  <th>Owner / Director Contact</th>
                  <th>Marketing Contact</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClinics.map((c) => {
                  const isChecked = selectedIds.includes(c.id);
                  return (
                    <tr key={c.id} style={isChecked ? { background: '#F8FAFC' } : {}}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(c.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{c.clinic_name}</div>
                        <div className="text-xs text-muted mt-1 flex items-center gap-1">
                          <EnterpriseIcon name="map-pin" size={13} color="#64748B" />
                          <span>{c.address}</span>
                        </div>
                        <div className="text-xs font-medium text-secondary mt-1 flex items-center gap-2 flex-wrap">
                          <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.speciality}</span>
                          {c.consultation_fee > 0 && (
                            <span className="badge badge-blue" style={{ fontSize: 10 }}>₹{c.consultation_fee} Fee</span>
                          )}
                          {c.experience_years > 0 && (
                            <span className="badge badge-teal" style={{ fontSize: 10 }}>{c.experience_years}+ Yrs Exp</span>
                          )}
                          {c.website && (
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs"
                              style={{ color: '#0284C7', textDecoration: 'none', fontWeight: 600 }}
                            >
                              🌐 Website ↗
                            </a>
                          )}
                          {c.apollo_enriched === 1 && (
                            <span className="badge badge-purple" style={{ fontSize: 10 }}>⚡ Apollo.io Verified</span>
                          )}
                          {c.linkedin_url && (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs"
                              style={{ color: '#0A66C2', textDecoration: 'none', fontWeight: 600 }}
                            >
                              👔 LinkedIn ↗
                            </a>
                          )}
                          <span className="text-xs text-muted">
                            Frontdesk: <strong>{c.reception_phone || 'Unlisted'}</strong>
                          </span>
                        </div>
                      </td>

                      <td>
                        {c.on_practo === 1 ? (
                          <div style={{ marginBottom: 6 }}>
                            <span className="badge badge-practo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <EnterpriseIcon name="award" size={12} color="#15803D" />
                              <span>Verified Practo</span>
                            </span>
                            <div className="text-xs text-secondary mt-1">
                              ⭐ <strong>{c.practo_rating || '4.8'}</strong> ({c.practo_reviews || 0} reviews)
                            </div>
                            {c.practo_url && (
                              <a href={c.practo_url} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: '#1456FD', textDecoration: 'none' }}>
                                View Practo ↗
                              </a>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginBottom: 6 }}>
                            <span className="badge badge-unlisted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <EnterpriseIcon name="alert-triangle" size={12} color="#C2410C" />
                              <span>Not On Practo</span>
                            </span>
                            <div className="text-xs text-secondary mt-1" style={{ color: '#C2410C', fontWeight: 600 }}>
                              Prime Target (100% Whitespace)
                            </div>
                          </div>
                        )}

                        {/* GMB & Google Presence */}
                        <div className="pt-1 mt-1" style={{ borderTop: '1px dashed #E2E8F0' }}>
                          <div className="flex items-center gap-1 text-xs text-secondary">
                            <EnterpriseIcon name="globe" size={12} color="#475569" />
                            <span>GMB: <strong>{c.gmb_rating ? `${c.gmb_rating}★` : '4.6★'}</strong> ({c.gmb_reviews || 20}+ revs)</span>
                          </div>
                          {c.gmb_url && (
                            <a href={c.gmb_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: '#0284C7', textDecoration: 'none' }}>
                              Google Maps ↗
                            </a>
                          )}
                          {c.is_ad_advertiser === 1 && (
                            <div className="mt-1">
                              <span className="badge badge-purple" style={{ fontSize: 9 }}>
                                🔥 Active Ad Spender ({c.ad_channel || 'Google/Meta'})
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{c.owner_name}</span>
                          {c.owner_name === 'Medical Director / Practice Head' && (
                            <span className="badge badge-gray" style={{ fontSize: 9, padding: '1px 5px' }}>Practice Leadership</span>
                          )}
                          {c.apollo_enriched === 1 && (
                            <span className="badge badge-teal" style={{ fontSize: 9, padding: '1px 5px' }}>Apollo Verified</span>
                          )}
                        </div>
                        <div className="text-xs font-bold flex items-center gap-1 mt-0.5" style={{ color: c.owner_phone ? '#1456FD' : '#94A3B8' }}>
                          <EnterpriseIcon name="phone" size={12} color={c.owner_phone ? '#1456FD' : '#94A3B8'} />
                          <span>{c.owner_phone || 'Unlisted'}</span>
                        </div>
                        <div className="text-xs text-muted truncate flex items-center gap-1 mt-0.5" style={{ maxWidth: 180, color: c.owner_email ? '#475569' : '#94A3B8' }}>
                          <EnterpriseIcon name="mail" size={12} color={c.owner_email ? '#64748B' : '#94A3B8'} />
                          <span>{c.owner_email || 'Unlisted'}</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.marketing_name}</div>
                        <div className="text-xs text-secondary flex items-center gap-1 mt-0.5" style={{ color: c.marketing_phone ? '#475569' : '#94A3B8' }}>
                          <EnterpriseIcon name="phone" size={12} color={c.marketing_phone ? '#475569' : '#94A3B8'} />
                          <span>{c.marketing_phone || 'Unlisted'}</span>
                        </div>
                        <div className="text-xs text-muted truncate flex items-center gap-1 mt-0.5" style={{ maxWidth: 180, color: c.marketing_email ? '#475569' : '#94A3B8' }}>
                          <EnterpriseIcon name="mail" size={12} color={c.marketing_email ? '#64748B' : '#94A3B8'} />
                          <span>{c.marketing_email || 'Unlisted'}</span>
                        </div>
                      </td>

                      <td>
                        <div className="flex gap-2 flex-col" style={{ width: 'max-content' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleQuickAssign(c.id, 'autopilot', 'prime')}
                          >
                            <EnterpriseIcon name="zap" size={12} color="#FFFFFF" />
                            <span>Auto Pilot (Prime)</span>
                          </button>
                          <button
                            className="btn btn-teal btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleQuickAssign(c.id, 'autopilot', 'reach')}
                          >
                            <EnterpriseIcon name="target" size={12} color="#FFFFFF" />
                            <span>Auto Pilot (Reach)</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleQuickAssign(c.id, 'manual', 'prime')}
                          >
                            <EnterpriseIcon name="phone-call" size={12} color="#1E2238" />
                            <span>Manual Queue</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssignModal(false)}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h2 className="section-title">Assign {selectedIds.length} Clinic(s) to CRM</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setAssignModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-2" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Execution Mode
                </label>
                <div className="grid-2" style={{ gap: 10 }}>
                  <label
                    style={{
                      border: `2px solid ${assignType === 'autopilot' ? '#1456FD' : '#E2E8F0'}`,
                      background: assignType === 'autopilot' ? '#EFF6FF' : '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="assignType"
                      checked={assignType === 'autopilot'}
                      onChange={() => setAssignType('autopilot')}
                      style={{ marginRight: 8 }}
                    />
                    <strong>🚀 Auto Pilot AI</strong>
                    <p className="text-xs text-secondary mt-1">Automatic Sarvam Voice calling + WhatsApp AI sequence.</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${assignType === 'manual' ? '#1456FD' : '#E2E8F0'}`,
                      background: assignType === 'manual' ? '#EFF6FF' : '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="assignType"
                      checked={assignType === 'manual'}
                      onChange={() => setAssignType('manual')}
                      style={{ marginRight: 8 }}
                    />
                    <strong>📞 Manual Dialing</strong>
                    <p className="text-xs text-secondary mt-1">Assigned to sales rep queue for direct manual outreach.</p>
                  </label>
                </div>
              </div>

              {assignType === 'autopilot' && (
                <div>
                  <label className="text-xs font-bold text-secondary mb-2" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Select Pitch Campaign Product
                  </label>
                  <div className="grid-2 mb-3" style={{ gap: 10 }}>
                    <label
                      style={{
                        border: `2px solid ${assignProduct === 'reach' ? '#0D9488' : '#E2E8F0'}`,
                        background: assignProduct === 'reach' ? '#F0FDFA' : '#FFFFFF',
                        padding: 14,
                        borderRadius: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="assignProduct"
                        checked={assignProduct === 'reach'}
                        onChange={() => setAssignProduct('reach')}
                        style={{ marginRight: 8 }}
                      />
                      <strong style={{ color: '#0F766E' }}>🎯 Practo Reach</strong>
                      <p className="text-xs text-secondary mt-1">Top-ranked spotlight position (#1 or #6) for high-intent searchers.</p>
                    </label>

                    <label
                      style={{
                        border: `2px solid ${assignProduct === 'prime' ? '#1456FD' : '#E2E8F0'}`,
                        background: assignProduct === 'prime' ? '#EFF6FF' : '#FFFFFF',
                        padding: 14,
                        borderRadius: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="assignProduct"
                        checked={assignProduct === 'prime'}
                        onChange={() => setAssignProduct('prime')}
                        style={{ marginRight: 8 }}
                      />
                      <strong style={{ color: '#1D4ED8' }}>🌟 Practo Prime</strong>
                      <p className="text-xs text-secondary mt-1">Assured patient booking guarantee + 24/7 instant online booking.</p>
                    </label>
                  </div>

                  {assignProduct === 'reach' && (
                    <div style={{ marginBottom: 14 }}>
                      <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                        Select Reach Inventory Slot to Pitch
                      </label>
                      <select
                        className="input"
                        value={assignReachSlotId}
                        onChange={(e) => setAssignReachSlotId(e.target.value)}
                        style={{ fontSize: 12.5 }}
                      >
                        {availableReachSlots.map((slot) => (
                          <option key={slot.slotId} value={slot.slotId}>
                            [Pos #{slot.position}] {slot.zone}, {slot.city} — {slot.speciality} (₹{slot.price3M?.toLocaleString('en-IN')}/3M)
                          </option>
                        ))}
                      </select>

                      {selectedAssignReachSlot && (
                        <div className="mt-2 text-xs" style={{ background: '#F0FDFA', border: '1px solid #99F6E4', padding: 8, borderRadius: 6, color: '#0F766E' }}>
                          ⚡ <strong>Pos #{selectedAssignReachSlot.position} Spotlight</strong> in <strong>{selectedAssignReachSlot.zone}</strong> · 📈 {selectedAssignReachSlot.monthlySearchVolume?.toLocaleString()} searches/mo · 💰 <strong>₹{selectedAssignReachSlot.price3M?.toLocaleString('en-IN')}/3M</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-between items-center mt-2 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAssignModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssignSubmit}
                  disabled={assigning}
                >
                  {assigning ? <span className="spinner" style={{ width: 16, height: 16 }} /> : `Confirm & Push (${selectedIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Auto-Launch Autopilot with Product & Reach Slot Picker ─────── */}
      {autoLaunchModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAutoLaunchModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <h3 className="section-title">Auto-Launch 100% Full Autopilot</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Select target product and Reach inventory slot so Voice AI can pitch exact locality pricing and placement.
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAutoLaunchModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAutoLaunchSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-2" style={{ display: 'block', textTransform: 'uppercase' }}>
                  1. Select Pitch Campaign Product
                </label>
                <div className="grid-3" style={{ gap: 10 }}>
                  <label
                    style={{
                      border: `2px solid ${autoLaunchProduct === 'reach' ? '#0D9488' : '#E2E8F0'}`,
                      background: autoLaunchProduct === 'reach' ? '#F0FDFA' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="launchProd"
                      checked={autoLaunchProduct === 'reach'}
                      onChange={() => setAutoLaunchProduct('reach')}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#0F766E' }}>🎯 Practo Reach</strong>
                    <p className="text-xs text-secondary mt-1">Exclusive spotlight sponsored slot (#1 or #6).</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${autoLaunchProduct === 'prime' ? '#1456FD' : '#E2E8F0'}`,
                      background: autoLaunchProduct === 'prime' ? '#EFF6FF' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="launchProd"
                      checked={autoLaunchProduct === 'prime'}
                      onChange={() => setAutoLaunchProduct('prime')}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#1D4ED8' }}>🌟 Practo Prime</strong>
                    <p className="text-xs text-secondary mt-1">24/7 instant online booking guarantee.</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${autoLaunchProduct === 'all' ? '#7C3AED' : '#E2E8F0'}`,
                      background: autoLaunchProduct === 'all' ? '#F5F3FF' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="launchProd"
                      checked={autoLaunchProduct === 'all'}
                      onChange={() => setAutoLaunchProduct('all')}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#6D28D9' }}>⚡ Smart Auto</strong>
                    <p className="text-xs text-secondary mt-1">Auto-allocates product by clinic traffic.</p>
                  </label>
                </div>
              </div>

              {/* Reach Inventory Slot Selection */}
              {autoLaunchProduct === 'reach' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    2. Select Reach Inventory Slot to Pitch
                  </label>
                  <select
                    className="input"
                    value={autoLaunchReachSlotId}
                    onChange={(e) => setAutoLaunchReachSlotId(e.target.value)}
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {availableReachSlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId}>
                        [Position #{slot.position}] {slot.zone}, {slot.city} — {slot.speciality} | {slot.monthlySearchVolume?.toLocaleString()} searches/mo | ₹{slot.price3M?.toLocaleString('en-IN')}/3M
                      </option>
                    ))}
                  </select>

                  {selectedAutoLaunchReachSlot && (
                    <div
                      className="mt-3"
                      style={{
                        background: 'linear-gradient(135deg, #F0FDFA 0%, #EFF6FF 100%)',
                        border: '1px solid #99F6E4',
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div className="flex justify-between items-center pb-2 mb-2" style={{ borderBottom: '1px solid #CCFBF1' }}>
                        <div>
                          <span className="badge badge-teal" style={{ fontWeight: 800 }}>
                            ⚡ Pos #{selectedAutoLaunchReachSlot.position} Spotlight
                          </span>
                          <span className="ml-2 font-bold" style={{ fontSize: 13, color: '#0F172A' }}>
                            {selectedAutoLaunchReachSlot.zone}, {selectedAutoLaunchReachSlot.city}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F766E' }}>
                            ₹{selectedAutoLaunchReachSlot.price3M?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-muted"> / 3M</span>
                        </div>
                      </div>

                      <div className="text-xs" style={{ color: '#334155', fontStyle: 'italic', background: '#FFFFFF', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                        🎙️ <strong>AI Script Preview:</strong> "Dr. [Name], Practo has opened an exclusive Position #{selectedAutoLaunchReachSlot.position} sponsorship in {selectedAutoLaunchReachSlot.zone} with {selectedAutoLaunchReachSlot.monthlySearchVolume?.toLocaleString()} monthly searches at ₹{selectedAutoLaunchReachSlot.price3M?.toLocaleString('en-IN')} for 3 months with 100% exclusivity."
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Batch Lead Count to Enqueue
                </label>
                <select
                  className="input"
                  value={autoLaunchLimit}
                  onChange={(e) => setAutoLaunchLimit(Number(e.target.value))}
                >
                  <option value={10}>10 Scraped Clinics</option>
                  <option value={25}>25 Scraped Clinics (Recommended)</option>
                  <option value={50}>50 Scraped Clinics</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAutoLaunchModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={autoLaunching}
                  style={{
                    background: 'linear-gradient(135deg, #1456FD 0%, #0D9488 100%)',
                    fontWeight: 800,
                  }}
                >
                  {autoLaunching ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⚡'}
                  <span>Launch Autopilot Outreach ({autoLaunchLimit} Leads)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
