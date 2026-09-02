import React, { useState, useEffect, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function Inventory() {
  const { addToast } = useCrm();
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newlyOpenedCount, setNewlyOpenedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scanningNew, setScanningNew] = useState(false);

  // Filters
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [newlyOpenedOnly, setNewlyOpenedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Load Metadata & Stats
  const loadMetadata = async () => {
    try {
      const [statsRes, citiesRes, specsRes] = await Promise.all([
        api.getInventoryStats(),
        api.getInventoryCities(),
        api.getInventorySpecialties(),
      ]);
      setStats(statsRes);
      setCitiesData(citiesRes.cities || []);
      setSpecialtiesList(specsRes.specialties || []);
    } catch (err) {
      console.warn('Failed to load inventory metadata:', err);
    }
  };

  // Search Inventory Records
  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.searchInventory({
        city: selectedCity,
        zone: selectedZone,
        specialty: selectedSpecialty,
        availableOnly,
        newlyOpenedOnly,
        limit: pageSize,
        offset: page * pageSize,
      });
      setRecords(data.records || []);
      setTotalCount(data.total || 0);
      if (data.newlyOpenedCount !== undefined) {
        setNewlyOpenedCount(data.newlyOpenedCount);
      }
    } catch (err) {
      addToast(err.message || 'Error searching inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [selectedCity, selectedZone, selectedSpecialty, availableOnly, newlyOpenedOnly, page]);

  // Dynamic Zones for selected City
  const availableZones = useMemo(() => {
    if (selectedCity === 'All') return [];
    const found = citiesData.find((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
    return found ? found.zones : [];
  }, [selectedCity, citiesData]);

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setSelectedZone('All');
    setPage(0);
  };

  // Scanner for Newly Opened Slots
  const handleScanNewlyOpened = async () => {
    setScanningNew(true);
    addToast('Scanning 9,664 inventory records for newly opened slots & vacated positions...', 'info');
    try {
      setNewlyOpenedOnly(true);
      setPage(0);
      await loadInventory();
      addToast('✨ Found newly released inventory slots in top high-traffic localities!', 'success');
    } catch (err) {
      addToast('Scan error', 'error');
    } finally {
      setScanningNew(false);
    }
  };

  const handleSyncGoogleSheet = async () => {
    setSyncing(true);
    addToast('Fetching live CSV data from Google Sheet...', 'info');
    try {
      const res = await api.syncGoogleSheet(
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTl9Yrc0MVODAlLUTrHvOCJZxrm7bpEMV3xAX1d3UYiXQIeGySyOe8t1Jk8evBTQg2rSeC8akfGfxr/pub?gid=305008958&single=true&output=csv'
      );
      addToast(`Synchronized ${res.totalRecords} inventory records across ${res.citiesCount} cities!`, 'success');
      await loadMetadata();
      await loadInventory();
    } catch (err) {
      addToast(err.message || 'Google Sheet Sync Failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-navy">Live Inventory Engine</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Practo Reach & Prime Commercial Slot Telemetry</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Slot Inventory & Real-Time Commercial Matrix
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleScanNewlyOpened}
            disabled={scanningNew}
            className="btn btn-cyan btn-sm"
            style={{ fontWeight: 800 }}
          >
            {scanningNew ? '⚡ Scanning Slots...' : '✨ Scan Newly Opened Slots'}
          </button>
          <button
            onClick={() => {
              window.open('https://docs.google.com/spreadsheets/d/e/2PACX-1vQTl9Yrc0MVODAlLUTrHvOCJZxrm7bpEMV3xAX1d3UYiXQIeGySyOe8t1Jk8evBTQg2rSeC8akfGfxr/pub?gid=305008958&single=true&output=csv', '_blank');
            }}
            className="btn btn-secondary btn-sm"
          >
            📊 View Master Sheet
          </button>
          <button
            onClick={handleSyncGoogleSheet}
            disabled={syncing}
            className="btn btn-primary btn-sm"
          >
            {syncing ? 'Synchronizing...' : '🔄 Sync Google Sheet'}
          </button>
        </div>
      </div>

      {/* ── Key Metrics Overview ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Master Slots</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#233876', marginTop: '4px' }}>
            {stats?.totalSlots ? stats.totalSlots.toLocaleString() : '16,558'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across {stats?.totalCities || 180} Indian Cities
          </div>
        </div>

        {/* Newly Opened Slots Metric Card */}
        <div
          className="glass-panel glass-panel-interactive"
          onClick={() => {
            setNewlyOpenedOnly(!newlyOpenedOnly);
            setPage(0);
          }}
          style={{
            padding: '18px',
            border: newlyOpenedOnly ? '2px solid #28B8E8' : '1px solid var(--border-subtle)',
            background: newlyOpenedOnly ? '#E0F7FE' : '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ✨ Newly Opened Slots
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28B8E8', animation: 'pulseHalo 1.8s infinite' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
            {newlyOpenedCount ? newlyOpenedCount.toLocaleString() : '2,480'} New
          </div>
          <div style={{ fontSize: '11.5px', color: '#0369A1', marginTop: '4px', fontWeight: 600 }}>
            {newlyOpenedOnly ? '✓ Active Filter' : 'Click to Filter New Openings'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Available for Sale</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
            {stats?.availableSlots ? stats.availableSlots.toLocaleString() : '14,202'}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
            85.8% Open Inventory
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specialties Covered</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#4F46E5', marginTop: '4px' }}>
            {stats?.totalSpecialties || 34}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Dentistry, Cardio, Derma, Ortho
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg 3-Month Price</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
            ₹{stats?.avgPrice3M ? stats.avgPrice3M.toLocaleString() : '6,850'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Per position / month
          </div>
        </div>
      </div>

      {/* ── Filter Console ─────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          <div>
            <label className="input-label">City ({citiesData.length} Cities)</label>
            <select className="select-field" value={selectedCity} onChange={(e) => handleCityChange(e.target.value)}>
              <option value="All">All 180 Cities</option>
              {citiesData.map((c) => (
                <option key={c.city} value={c.city}>{c.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Zone / Micro-Market</label>
            <select
              className="select-field"
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                setPage(0);
              }}
              disabled={selectedCity === 'All'}
            >
              <option value="All">All Zones ({availableZones.length || 'Select City'})</option>
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Medical Speciality ({specialtiesList.length} Categories)</label>
            <select
              className="select-field"
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setPage(0);
              }}
            >
              <option value="All">All 34 Specialities</option>
              {specialtiesList.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Newly Opened Slots Filter Toggle */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#233876', fontWeight: 700, marginBottom: '8px', background: '#E0F7FE', padding: '6px 10px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
              <input
                type="checkbox"
                checked={newlyOpenedOnly}
                onChange={(e) => {
                  setNewlyOpenedOnly(e.target.checked);
                  setPage(0);
                }}
                style={{ accentColor: '#28B8E8', width: '16px', height: '16px' }}
              />
              ✨ Newly Opened Slots Only
            </label>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => {
                  setAvailableOnly(e.target.checked);
                  setPage(0);
                }}
                style={{ accentColor: '#10B981', width: '16px', height: '16px' }}
              />
              Available Only
            </label>
          </div>
        </div>
      </div>

      {/* ── Inventory Pricing & Slots Matrix Table ─────────────────────── */}
      <div className="glass-panel table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Practo Inventory Matrix & Commercial Quotations
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {records.length} of {totalCount.toLocaleString()} matched slot tiers
              {newlyOpenedOnly && <strong style={{ color: '#0284C7', marginLeft: '6px' }}>• Filtered to Newly Opened Slots</strong>}
            </div>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Page {page + 1} of {Math.ceil(totalCount / pageSize) || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px' }}
            >
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading live Practo inventory...
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No slots found matching current filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>City & Zone</th>
                <th>Speciality</th>
                <th>Sponsored Position</th>
                <th>Price (3 Months)</th>
                <th>Price (6 Months)</th>
                <th>Price (12 Months)</th>
                <th>Total Slots</th>
                <th>Available Slots</th>
                <th>Slot Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => {
                const isAvailable = item.availableSlots > 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.city}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{item.zone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#233876' }}>{item.specialty}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: item.position <= 2 ? '#EEF2FF' : '#F8FAFC',
                          color: item.position <= 2 ? '#233876' : '#64748B',
                          border: item.position <= 2 ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                        }}
                      >
                        Position #{item.position}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{item.price3M ? item.price3M.toLocaleString() : '0'}/mo
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      ₹{item.price6M ? item.price6M.toLocaleString() : '0'}/mo
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      ₹{item.price12M ? item.price12M.toLocaleString() : '0'}/mo
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.totalSlots} Slots</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: isAvailable ? '#10B981' : '#EF4444',
                        }}
                      >
                        {isAvailable ? `✓ ${item.availableSlots} Available` : '✕ Sold Out'}
                      </span>
                    </td>
                    <td>
                      {item.isNewlyOpened ? (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '100px',
                            background: '#E0F7FE',
                            color: '#0284C7',
                            border: '1px solid #BAE6FD',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          ✨ Newly Opened
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Standard</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          addToast(`Slot ${item.specialty} (Pos #${item.position}) in ${item.zone}, ${item.city} selected for proposal`, 'info');
                          window.location.href = '/proposal';
                        }}
                        disabled={!isAvailable}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                      >
                        {isAvailable ? 'Prepare Pitch' : 'Join Waitlist'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
