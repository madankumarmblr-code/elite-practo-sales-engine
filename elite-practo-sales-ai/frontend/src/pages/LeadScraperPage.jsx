import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function LeadScraperPage() {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [specialities, setSpecialities] = useState([]);

  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [selectedZone, setSelectedZone] = useState('Indiranagar');
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
  const [availableReachSlots, setAvailableReachSlots] = useState([]);
  const [assignReachSlotId, setAssignReachSlotId] = useState('');

  const [autoLaunchModal, setAutoLaunchModal] = useState(false);
  const [autoLaunchProduct, setAutoLaunchProduct] = useState('reach'); // 'reach' | 'prime' | 'all'
  const [autoLaunchReachSlotId, setAutoLaunchReachSlotId] = useState('');
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

  // Load cities on mount
  useEffect(() => {
    api.getInventoryCities()
      .then((c) => {
        setCities(c || []);
        if (c && c.length && !c.includes('Bangalore')) setSelectedCity(c[0]);
      })
      .catch(() => {});
  }, []);

  // Cascading: when City changes, fetch Zones
  useEffect(() => {
    if (!selectedCity) { setZones([]); return; }
    api.getInventoryZones(selectedCity)
      .then((z) => {
        setZones(z || []);
        if (z && z.length > 0) {
          if (!z.includes(selectedZone)) setSelectedZone(z[0]);
        } else {
          setSelectedZone('');
        }
      })
      .catch(() => setZones([]));
  }, [selectedCity]); // eslint-disable-line

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
        locality: selectedZone,
        speciality: selectedSpec,
        refresh: forceRefresh ? 'true' : undefined,
      });
      setClinics(data.clinics || []);
      setStats({
        total: data.totalFound ?? data.total ?? (data.clinics || []).length,
        availableOnPracto: data.onPractoCount ?? data.availableOnPracto ?? (data.clinics || []).filter((c) => c.on_practo === 1).length,
        notOnPracto: data.notOnPractoCount ?? data.notOnPracto ?? (data.clinics || []).filter((c) => c.on_practo === 0).length,
      });
      if (forceRefresh) {
        setMessage({
          type: 'success',
          text: `⚡ Multi-source live discovery complete! Scraped Practo.com, Google Search & Clinic Websites for ${selectedZone || selectedCity}.`,
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

  const filteredClinics = clinics.filter((c) => {
    if (filterPracto === 'on_practo') return c.on_practo === 1;
    if (filterPracto === 'not_on_practo') return c.on_practo === 0;
    return true;
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 24 }}>🔍</span>
            <h1 className="page-title">Clinic & Hospital Lead Scraper</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Discover verified clinics by City, Locality, and Speciality with owner & marketing contacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700 }}
            onClick={() => setAutoLaunchModal(true)}
          >
            ⚡ Auto-Launch Autopilot (All Leads)
          </button>

          {selectedIds.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => setAssignModal(true)}>
              🚀 Push {selectedIds.length} to Autopilot
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Cascading Filter Controls */}
      <div className="card mb-6" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <form onSubmit={handleSearch}>
          <div className="grid-3" style={{ gap: 14 }}>
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
                2. Locality / Zone ({zones.length})
              </label>
              <select className="input" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={zones.length === 0}>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                3. Speciality / Keyword ({specialities.length})
              </label>
              <select className="input" value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)} disabled={specialities.length === 0}>
                {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid #F1F5F9' }}>
            <div className="text-xs text-muted">
              Target Territory: <strong>{selectedCity}</strong> → <strong>{selectedZone || 'All'}</strong> → <strong>{selectedSpec || 'All'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                disabled={loading}
              >
                🔍 Quick Search
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={(e) => handleSearch(e, true)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>⚡</span>
                <span>{loading ? 'Scraping Live Web...' : 'Live Multi-Source Scrape (Practo + Google + Websites)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Sub-header with Filter Pills */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
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
                  <th>Practo Status</th>
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
                        <div className="text-xs text-muted mt-1">📍 {c.address}</div>
                        <div className="text-xs font-medium text-secondary mt-1">
                          <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.speciality}</span>
                          <span className="text-xs text-muted" style={{ marginLeft: 6 }}>📞 Frontdesk: {c.reception_phone}</span>
                        </div>
                      </td>

                      <td>
                        {c.on_practo === 1 ? (
                          <div>
                            <span className="badge badge-practo">✓ On Practo</span>
                            <div className="text-xs text-secondary mt-1">
                              ⭐ <strong>{c.practo_rating}</strong> ({c.practo_reviews} reviews)
                            </div>
                            {c.practo_url && (
                              <a href={c.practo_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: '#1456FD', textDecoration: 'none' }}>
                                View Profile ↗
                              </a>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="badge badge-unlisted">⚡ Not On Practo</span>
                            <div className="text-xs text-secondary mt-1" style={{ color: '#C2410C', fontWeight: 600 }}>
                              Prime Target (100% Whitespace)
                            </div>
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.owner_name}</div>
                        <div className="text-xs font-bold" style={{ color: '#1456FD' }}>📞 {c.owner_phone}</div>
                        <div className="text-xs text-muted truncate" style={{ maxWidth: 170 }}>✉️ {c.owner_email}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.marketing_name}</div>
                        <div className="text-xs text-secondary">📞 {c.marketing_phone}</div>
                        <div className="text-xs text-muted truncate" style={{ maxWidth: 170 }}>✉️ {c.marketing_email}</div>
                      </td>

                      <td>
                        <div className="flex gap-2 flex-col" style={{ width: 'max-content' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleQuickAssign(c.id, 'autopilot', 'prime')}
                          >
                            🚀 Auto Pilot (Prime)
                          </button>
                          <button
                            className="btn btn-teal btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleQuickAssign(c.id, 'autopilot', 'reach')}
                          >
                            🎯 Auto Pilot (Reach)
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleQuickAssign(c.id, 'manual', 'prime')}
                          >
                            📞 Manual Queue
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
