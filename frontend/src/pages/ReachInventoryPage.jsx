import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import PractoLogo from '../components/PractoLogo.jsx';

const METRO_CITIES = ['All Metros', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];

const SPEC_ICONS = {
  dentist: '🦷',
  dental: '🦷',
  dermatologist: '✨',
  pediatrician: '👶',
  general: '🩺',
  physician: '🩺',
  cardiologist: '🫀',
  gynecologist: '🌸',
  orthopedist: '🦴',
  ophthalmologist: '👁️',
};

function getSpecIcon(spec) {
  const s = String(spec || '').toLowerCase();
  for (const [k, icon] of Object.entries(SPEC_ICONS)) {
    if (s.includes(k)) return icon;
  }
  return '🏥';
}

export default function ReachInventoryPage({ onSelectSlotForProposal }) {
  const [activeTab, setActiveTab] = useState('newly_opened'); // 'newly_opened' | 'directory'
  const [stats, setStats] = useState(null);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [specialities, setSpecialities] = useState([]);

  // Newly Opened Slots State
  const [newlyOpenedSlots, setNewlyOpenedSlots] = useState([]);
  const [loadingNewlyOpened, setLoadingNewlyOpened] = useState(false);
  const [newlyOpenedCity, setNewlyOpenedCity] = useState('All Metros');

  // Directory Search filters
  const [searchCity, setSearchCity] = useState('Bangalore');
  const [searchZone, setSearchZone] = useState('');
  const [searchSpec, setSearchSpec] = useState('');
  const [searchPosition, setSearchPosition] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Load initial stats & cities
  useEffect(() => {
    api.getInventoryStats().then(setStats).catch(() => {});
    api.getInventoryCities().then((c) => {
      setCities(c || []);
      if (c && c.length > 0 && !searchCity) setSearchCity(c[0]);
    }).catch(() => {});
  }, []);

  // Fetch Newly Opened Slots
  async function loadNewlyOpened(city = '') {
    setLoadingNewlyOpened(true);
    try {
      const c = city && city !== 'All Metros' ? city : undefined;
      const data = await api.getNewlyOpenedSlots({ city: c, limit: 60 });
      setNewlyOpenedSlots(data || []);
    } catch (err) {
      console.warn('[NewlyOpenedSlots Error]', err.message);
    } finally {
      setLoadingNewlyOpened(false);
    }
  }

  useEffect(() => {
    loadNewlyOpened(newlyOpenedCity);
  }, [newlyOpenedCity]);

  // Cascading zones when searchCity changes
  useEffect(() => {
    if (searchCity) {
      api.getInventoryZones(searchCity).then((z) => {
        setZones(z || []);
        setSearchZone('');
        setSpecialities([]);
      }).catch(() => {});
    }
  }, [searchCity]);

  // Cascading specialities when searchZone changes
  useEffect(() => {
    if (searchCity && searchZone) {
      api.getInventorySpecialities(searchCity, searchZone).then((s) => {
        setSpecialities(s || []);
        setSearchSpec('');
      }).catch(() => {});
    }
  }, [searchCity, searchZone]);

  // Execute search
  async function handleSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await api.searchInventory({
        city: searchCity,
        zone: searchZone,
        speciality: searchSpec,
        position: searchPosition,
        availableOnly,
        limit: 150,
      });
      setResults(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Auto-search on mount
  useEffect(() => {
    handleSearch();
  }, []); // eslint-disable-line

  function exportInventoryCsv(itemsToExport, filename) {
    if (!itemsToExport || itemsToExport.length === 0) return;
    const headers = ['City', 'Zone', 'Speciality', 'Position', 'Total Slots', 'Available Slots', '3M Price', '6M Price', '12M Price'];
    const lines = [headers.join(',')];
    for (const r of itemsToExport) {
      lines.push([
        `"${r.city}"`,
        `"${r.zone}"`,
        `"${r.speciality}"`,
        r.position,
        r.totalSlots,
        r.availableSlots,
        r.price3M,
        r.price6M,
        r.price12M,
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <PractoLogo size="md" />
            <div>
              <h1 className="page-title" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 8 }}>
                Reach Inventory & Spotlight Slots
              </h1>
              <p className="text-sm text-secondary mt-1">
                Real-time spotlight slot inventory, newly unlocked positions, and commercial pricing across 180 Indian cities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'newly_opened' ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportInventoryCsv(newlyOpenedSlots, 'newly_opened_reach_slots')}
              disabled={newlyOpenedSlots.length === 0}
            >
              📥 Export Newly Opened ({newlyOpenedSlots.length})
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportInventoryCsv(results, `reach_inventory_${searchCity || 'all'}`)}
              disabled={results.length === 0}
            >
              📥 Export Directory CSV ({results.length})
            </button>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={activeTab === 'newly_opened' ? () => loadNewlyOpened(newlyOpenedCity) : handleSearch}
            disabled={loading || loadingNewlyOpened}
          >
            {loading || loadingNewlyOpened ? 'Refreshing...' : '⟳ Refresh Live Slots'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid-4 mb-6">
        <div className="stat-card" style={{ '--stat-color': '#1456FD' }}>
          <div className="text-xs text-muted uppercase font-bold">Total Catalog Slots</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1456FD' }}>
            {stats?.totalSlots?.toLocaleString('en-IN') ?? '16,559'}
          </div>
          <div className="text-xs text-secondary mt-1">Across 180 Indian Cities</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#10B981' }}>
          <div className="text-xs text-muted uppercase font-bold">Available Slots (Open)</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#10B981' }}>
            {stats?.availableSlots?.toLocaleString('en-IN') ?? '14,098'}
          </div>
          <div className="text-xs text-secondary mt-1">Ready for immediate client booking</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#F59E0B' }}>
          <div className="text-xs text-muted uppercase font-bold">Newly Opened Slots</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#EA580C' }}>
            {newlyOpenedSlots.length > 0 ? `${newlyOpenedSlots.length}+ Fresh` : '48 Unlocked'}
          </div>
          <div className="text-xs text-secondary mt-1">Unlocked in past 24-48 hours</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#0D9488' }}>
          <div className="text-xs text-muted uppercase font-bold">Catalog Cities</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0D9488' }}>
            {stats?.totalCities ?? 180}
          </div>
          <div className="text-xs text-secondary mt-1">Metros, Tier-1 & Tier-2 Hubs</div>
        </div>
      </div>

      {/* View Mode Selector Tabs */}
      <div className="flex justify-between items-center mb-6 border-b pb-3" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex gap-2">
          <button
            className={`btn ${activeTab === 'newly_opened' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('newly_opened')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
          >
            <span>🔥</span>
            <strong>Newly Opened Slots</strong>
            <span
              style={{
                background: activeTab === 'newly_opened' ? '#FFFFFF' : '#EA580C',
                color: activeTab === 'newly_opened' ? '#EA580C' : '#FFFFFF',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              LIVE
            </span>
          </button>

          <button
            className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('directory')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
          >
            <span>📊</span>
            <span>All Inventory Directory (16,559 Slots)</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: NEWLY OPENED SLOTS (FRESH UNLOCKS) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'newly_opened' && (
        <div className="fade-in">
          {/* Newly Opened Hero Banner */}
          <div
            className="card mb-6"
            style={{
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              border: '1px solid #FED7AA',
              padding: '20px 24px',
            }}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 22 }}>🔥</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#9A3412', margin: 0 }}>
                    Newly Opened Spotlight Positions — Claim Before Competitors Book
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: '#C2410C', marginTop: 6, maxWidth: 800, lineHeight: 1.5 }}>
                  These spotlight positions have newly unlocked due to expired quarterly contracts or new search capacity in top high-patient-demand zones. Use these fresh slots to pitch premier doctors via Autopilot AI or create high-urgency proposals.
                </p>
              </div>

              {/* Metro Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {METRO_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewlyOpenedCity(c)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: newlyOpenedCity === c ? '#EA580C' : '#FDBA74',
                      background: newlyOpenedCity === c ? '#EA580C' : '#FFFFFF',
                      color: newlyOpenedCity === c ? '#FFFFFF' : '#9A3412',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Newly Opened Slots Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingNewlyOpened ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                <p className="text-sm text-secondary">Loading newly opened spotlight slots...</p>
              </div>
            ) : newlyOpenedSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                <h3 className="section-title">No Newly Opened Slots in This Selection</h3>
                <p className="text-sm text-secondary mt-1">Switch metro filter or explore the Full Inventory Directory.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Speciality & Zone</th>
                      <th>City</th>
                      <th>Placement</th>
                      <th>Freshness</th>
                      <th>Patient Search Volume</th>
                      <th>Availability</th>
                      <th>Quarterly Rate (3M)</th>
                      <th>Half-Year (6M)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newlyOpenedSlots.map((slot) => {
                      const icon = getSpecIcon(slot.speciality);

                      return (
                        <tr key={slot.slotId || `${slot.city}_${slot.zone}_${slot.speciality}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 18 }}>{icon}</span>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13.5 }}>
                                  {slot.speciality}
                                </div>
                                <div className="text-xs text-secondary">
                                  📍 {slot.zone}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{slot.city}</span>
                          </td>

                          <td>
                            <span className="badge badge-blue" style={{ fontWeight: 800 }}>
                              ⚡ Position {slot.position} Spotlight
                            </span>
                          </td>

                          <td>
                            <span
                              style={{
                                background: '#FEF2F2',
                                color: '#B91C1C',
                                border: '1px solid #FECACA',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              🔥 {slot.openedAtLabel}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>
                              {slot.monthlySearchVolume?.toLocaleString('en-IN') || '6,500'}+
                            </div>
                            <div className="text-xs text-muted">patient searches/mo</div>
                          </td>

                          <td>
                            <span
                              className="badge"
                              style={{
                                background: slot.availableSlots === 1 ? '#FEF3C7' : '#DCFCE7',
                                color: slot.availableSlots === 1 ? '#92400E' : '#166534',
                                fontWeight: 700,
                              }}
                            >
                              {slot.urgency}
                            </span>
                          </td>

                          <td className="font-bold" style={{ color: '#0F172A' }}>
                            ₹{slot.price3M?.toLocaleString('en-IN')}
                            <span className="text-xs text-muted font-normal">/mo</span>
                          </td>

                          <td className="font-bold" style={{ color: '#0F172A' }}>
                            ₹{slot.price6M?.toLocaleString('en-IN')}
                            <span className="text-xs text-muted font-normal">/mo</span>
                          </td>

                          <td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                                onClick={() => {
                                  if (onSelectSlotForProposal) onSelectSlotForProposal(slot);
                                  else {
                                    window.location.href = `/?tab=proposals&slot=${encodeURIComponent(slot.speciality)}&zone=${encodeURIComponent(slot.zone)}&city=${encodeURIComponent(slot.city)}`;
                                  }
                                }}
                              >
                                📑 Build Proposal
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
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 2: COMPLETE INVENTORY DIRECTORY */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="fade-in">
          {/* Live Search & Cascading Filter Controls */}
          <div className="card mb-6">
            <form onSubmit={handleSearch}>
              <div className="grid-4" style={{ gap: 14 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    City (180 Cities)
                  </label>
                  <select className="input" value={searchCity} onChange={(e) => setSearchCity(e.target.value)}>
                    <option value="">All Cities</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Zone / Locality
                  </label>
                  <select
                    className="input"
                    value={searchZone}
                    onChange={(e) => setSearchZone(e.target.value)}
                    disabled={!searchCity || zones.length === 0}
                  >
                    <option value="">{zones.length === 0 ? 'Select City first' : 'All Zones'}</option>
                    {zones.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Speciality
                  </label>
                  <select
                    className="input"
                    value={searchSpec}
                    onChange={(e) => setSearchSpec(e.target.value)}
                    disabled={!searchZone || specialities.length === 0}
                  >
                    <option value="">{specialities.length === 0 ? 'Select Zone first' : 'All Specialities'}</option>
                    {specialities.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Position
                  </label>
                  <select className="input" value={searchPosition} onChange={(e) => setSearchPosition(e.target.value)}>
                    <option value="">All Positions (1 & 6)</option>
                    <option value="1">Position 1 (Spotlight Top Banner)</option>
                    <option value="6">Position 6 (Mid-Page Spotlight)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  <span>Show Available Slots Only (Exclude Sold Out)</span>
                </label>

                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? 'Searching...' : '🔍 Search Inventory'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                <p className="text-sm text-secondary">Searching catalog slots...</p>
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <h3 className="section-title">No Inventory Slots Found</h3>
                <p className="text-sm text-secondary mt-1">Try broadening your search city or zone filters.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Territory / Zone</th>
                      <th>Speciality</th>
                      <th>Position</th>
                      <th>Slot Capacity</th>
                      <th>3 Months</th>
                      <th>6 Months</th>
                      <th>12 Months</th>
                      <th>Booking Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const isAvailable = r.availableSlots > 0;
                      return (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.city}</div>
                            <div className="text-xs text-secondary">{r.zone}</div>
                          </td>
                          <td>
                            <span className="badge badge-gray">{r.speciality}</span>
                          </td>
                          <td>
                            <span className={`badge ${r.position === '1' ? 'badge-blue' : 'badge-teal'}`}>
                              {r.position === '1' ? '⚡ Position 1' : '🎯 Position 6'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${isAvailable ? 'badge-green' : 'badge-red'}`}>
                              {isAvailable ? `✓ ${r.availableSlots}/${r.totalSlots} Available` : '✕ Sold Out'}
                            </span>
                          </td>
                          <td className="font-bold">₹{r.price3M.toLocaleString('en-IN')}<span className="text-xs text-muted font-normal">/mo</span></td>
                          <td className="font-bold">₹{r.price6M.toLocaleString('en-IN')}<span className="text-xs text-muted font-normal">/mo</span></td>
                          <td className="font-bold">₹{r.price12M.toLocaleString('en-IN')}<span className="text-xs text-muted font-normal">/mo</span></td>
                          <td>
                            <span className={`badge ${isAvailable ? 'badge-blue' : 'badge-warn'}`}>
                              {isAvailable ? 'Bookable' : 'Waitlist'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
