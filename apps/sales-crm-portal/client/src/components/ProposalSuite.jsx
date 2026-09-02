import React, { useState, useEffect, useRef } from 'react';
import { PractoLogo } from './PractoLogo';
import { PRACTO_SPECIALTIES } from '../data/specialties';
import {
  SCOPE_TEXTS,
  DEFAULT_TNC,
  PRACTO_COMPANY,
  PRACTO_BANK,
  calculateDealScore,
  generateAiPitch,
} from '../data/pitchData.js';

// Helper: Format Indian Currency
function fmt(n) {
  if (!n || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Reach Block Component ──────────────────────────────────────────────────
function ReachCampaignBlock({ id, block, onChange, onRemove, inventoryData }) {
  const cities = [...new Set(inventoryData.map((r) => r.city || r.City))].filter(Boolean);
  const zones = block.city
    ? [...new Set(inventoryData.filter((r) => (r.city || r.City) === block.city).map((r) => r.zone || r.Zone))].filter(Boolean)
    : [];
  
  // Use official Practo specialties or filter from inventory
  const availableSpecs = block.zone
    ? [...new Set(inventoryData.filter((r) => (r.city || r.City) === block.city && (r.zone || r.Zone) === block.zone).map((r) => r.specialty || r.Speciality))].filter(Boolean)
    : PRACTO_SPECIALTIES;
  
  const specs = availableSpecs.length > 0 ? availableSpecs : PRACTO_SPECIALTIES;

  const positions = [1, 2, 3, 4, 5, 6, 7];

  const match = inventoryData.find(
    (r) =>
      (r.city || r.City) === block.city &&
      (r.zone || r.Zone) === block.zone &&
      (r.specialty || r.Speciality) === block.specialty &&
      parseInt(r.position || r.Position, 10) === parseInt(block.position, 10)
  );

  useEffect(() => {
    if (!match) {
      if (block.city && block.zone && block.specialty && block.position) {
        // Fallback default pricing if not explicitly in table
        const dur = parseInt(block.duration, 10) || 3;
        const defaultRate = block.position <= 2 ? 14000 : block.position <= 4 ? 9500 : 6500;
        const rate = dur === 12 ? defaultRate * 0.85 : dur === 6 ? defaultRate * 0.92 : defaultRate;
        onChange(id, 'price', Math.round(rate));
        onChange(id, 'availableSlots', 3);
        onChange(id, 'totalSlots', 3);
      }
      return;
    }

    let basePrice = 0;
    const dur = parseInt(block.duration, 10) || 3;
    if (dur === 3 && (match.price3M || match.Price_3M)) basePrice = match.price3M || match.Price_3M;
    else if (dur === 6 && (match.price6M || match.Price_6M)) basePrice = match.price6M || match.Price_6M;
    else if (dur === 12 && (match.price12M || match.Price_12M)) basePrice = match.price12M || match.Price_12M;
    else basePrice = match.price3M || match.Pricing || 8000;

    const avail = match.availableSlots !== undefined ? parseInt(match.availableSlots, 10) : (match.Slots ? parseInt(match.Slots, 10) : 3);
    const total = match.totalSlots !== undefined ? parseInt(match.totalSlots, 10) : (avail || 3);

    onChange(id, 'price', basePrice);
    onChange(id, 'availableSlots', avail);
    onChange(id, 'totalSlots', total);
  }, [block.city, block.zone, block.specialty, block.position, block.duration, match]);

  const maxSlots = block.availableSlots === 99 || !block.availableSlots ? 3 : block.availableSlots;
  const soldOut = block.availableSlots === 0;

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', position: 'relative', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#28328C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📍 Reach Spotlight Campaign #{id}
        </span>
        {id > 1 && (
          <button
            type="button"
            onClick={() => onRemove(id)}
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#E11D48', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={labelStyle}>City</label>
          <select className="select-field" value={block.city || ''} onChange={(e) => onChange(id, 'city', e.target.value)} style={inputStyle}>
            <option value="">Select City</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Zone / Locality</label>
          <select className="select-field" value={block.zone || ''} onChange={(e) => onChange(id, 'zone', e.target.value)} style={inputStyle}>
            <option value="">Select Zone</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Specialty</label>
          <select className="select-field" value={block.specialty || ''} onChange={(e) => onChange(id, 'specialty', e.target.value)} style={inputStyle}>
            <option value="">Select Specialty</option>
            {specs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Position</label>
          <select className="select-field" value={block.position || ''} onChange={(e) => onChange(id, 'position', parseInt(e.target.value, 10))} style={inputStyle}>
            <option value="">Select Position</option>
            {positions.map((p) => <option key={p} value={p}>Position {p}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <select className="select-field" value={block.duration || '3'} onChange={(e) => onChange(id, 'duration', e.target.value)} style={inputStyle}>
            <option value="3">3 Months</option>
            <option value="6">6 Months</option>
            <option value="12">12 Months</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Slots Booked</label>
          <select className="select-field" value={block.quantity || 1} onChange={(e) => onChange(id, 'quantity', parseInt(e.target.value, 10))} disabled={soldOut} style={inputStyle}>
            {Array.from({ length: Math.max(maxSlots, 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} Slot{n > 1 ? 's' : ''} ({Math.round((n / (block.totalSlots || 3)) * 100)}% SoS)</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Price / Month (₹)</label>
          <input
            className="input-field"
            type="number"
            value={block.price || ''}
            onChange={(e) => onChange(id, 'price', parseFloat(e.target.value) || 0)}
            style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #CBD5E1' }}>
        <div>
          {soldOut ? (
            <span style={{ color: '#EF4444', fontWeight: 700 }}>✕ Position Sold Out</span>
          ) : (
            <span style={{ color: '#0D9488', fontWeight: 700 }}>
              ✓ {block.availableSlots || 3} of {block.totalSlots || 3} Slots Available
            </span>
          )}
        </div>
        <div style={{ fontWeight: 800, color: '#1E2238' }}>
          Campaign Total: <span style={{ color: '#28328C', fontSize: '13px' }}>₹{fmt((block.price || 0) * (parseInt(block.duration, 10) || 3) * (block.quantity || 1))}</span>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #E2E8F0',
  fontSize: '12.5px',
  background: '#FFFFFF',
  color: '#0F172A',
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── Main Commercial Suite Component ────────────────────────────────────────
export default function ProposalSuite({ lead, onClose }) {
  const [docType, setDocType] = useState('PROPOSAL'); // 'PROPOSAL' | 'PROFORMA INVOICE'

  // Product Selection Toggles
  const [hasPrime, setHasPrime] = useState(false);
  const [hasReach, setHasReach] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  // Prime Configuration
  const [primeVariant, setPrimeVariant] = useState('supreme'); // 'supreme' | 'ai'
  const [primeAmount, setPrimeAmount] = useState(0);
  const [callCharge, setCallCharge] = useState(250);
  const [bookCharge, setBookCharge] = useState(300);
  const [pfcCharge, setPfcCharge] = useState(350);

  // Reach Campaigns
  const [reachBlocks, setReachBlocks] = useState([
    { id: 1, city: lead?.city || 'Bangalore', zone: lead?.zone || '', specialty: lead?.specialty || 'General Dentistry', position: 1, duration: '6', quantity: 1, price: 12000, availableSlots: 3, totalSlots: 3 },
  ]);

  // Financials
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmtPerMonth, setDiscountAmtPerMonth] = useState(0);
  const [taxPct, setTaxPct] = useState(18);
  const [tdsPct, setTdsPct] = useState(2);
  const [includeTds, setIncludeTds] = useState(true);

  // Proforma Invoice Specific Fields
  const [invNo, setInvNo] = useState(`PI/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [clientName, setClientName] = useState(lead?.organization || lead?.name || 'CUTIS INTERNATIONAL COSMETIC CLINICS PVT LTD');
  const [clientPan, setClientPan] = useState('AACCN8042Q');
  const [clientGst, setClientGst] = useState('29AACCN8042Q1ZS');
  const [clientAddr, setClientAddr] = useState(lead?.address || '#123, 4th Main Road, Indiranagar, Bengaluru, Karnataka - 560038');
  const [serviceCat, setServiceCat] = useState('Information Technology Software');
  const [sacCode, setSacCode] = useState('998313');

  // Inventory Database for dynamic pricing lookup
  const [inventoryData, setInventoryData] = useState([]);

  // Load Inventory from Backend
  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await fetch('/api/inventory?limit=500');
        const data = await res.json();
        if (data.records) setInventoryData(data.records);
      } catch (err) {
        console.warn('Inventory fetch failed, using defaults');
      }
    }
    loadInventory();
  }, []);

  // Sync Discount % and Discount Amount per Month
  const handleDiscountPctChange = (pct) => {
    const p = parseFloat(pct) || 0;
    setDiscountPct(p);
    const reachMonthlyGross = reachBlocks.reduce((acc, b) => acc + (b.price || 0) * (b.quantity || 1), 0);
    setDiscountAmtPerMonth(Math.round(reachMonthlyGross * (p / 100)));
  };

  const handleDiscountAmtChange = (amt) => {
    const a = parseFloat(amt) || 0;
    setDiscountAmtPerMonth(a);
    const reachMonthlyGross = reachBlocks.reduce((acc, b) => acc + (b.price || 0) * (b.quantity || 1), 0);
    if (reachMonthlyGross > 0) {
      setDiscountPct(parseFloat(((a / reachMonthlyGross) * 100).toFixed(2)));
    }
  };

  // Calculations
  const reachGrossTotal = reachBlocks.reduce((sum, b) => {
    if (b.price > 0 && b.quantity > 0) {
      return sum + b.price * (parseInt(b.duration, 10) || 3) * b.quantity;
    }
    return sum;
  }, 0);

  const primeGrossTotal = hasPrime ? (primeAmount || 0) : 0;
  const grossSubtotal = primeGrossTotal + (hasReach ? reachGrossTotal : 0);

  // Discount applies strictly to Reach campaigns per Practo policy
  const discountTotalAmount = (hasReach ? reachGrossTotal : 0) * (discountPct / 100);
  const taxableBaseAmount = grossSubtotal - discountTotalAmount;
  const gstAmount = taxableBaseAmount * (taxPct / 100);
  const invoiceTotal = taxableBaseAmount + gstAmount;
  const tdsAmount = taxableBaseAmount * (tdsPct / 100);
  const netPayable = invoiceTotal - tdsAmount;

  const maxDuration = hasReach
    ? Math.max(...reachBlocks.map((b) => parseInt(b.duration, 10) || 3))
    : (hasPrime ? 6 : 3);

  const dealScore = calculateDealScore({
    hasPrime,
    hasReach,
    duration: maxDuration,
    discountPct,
    totalValue: invoiceTotal,
  });

  const aiPitch = (hasPrime || hasReach) && lead
    ? generateAiPitch(
        hasPrime ? (primeVariant === 'supreme' ? 'PRIME_SUPREME' : 'PRIME_AI') : 'REACH',
        {
          name: lead.name || lead.organization,
          specialty: lead.specialty || 'Healthcare Specialist',
          city: lead.city || 'Bangalore',
          zone: lead.zone || '',
          patientVolumeMonthly: lead.patientVolumeMonthly || 1400,
        },
        {
          term: String(maxDuration),
          callCharge,
          bookCharge,
          pfcCharge,
          totalPrice: fmt(includeTds ? netPayable : invoiceTotal),
        }
      )
    : null;

  const handleReachChange = (id, field, value) => {
    setReachBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleAddReachBlock = () => {
    const nextId = Math.max(...reachBlocks.map((b) => b.id), 0) + 1;
    setReachBlocks((prev) => [
      ...prev,
      { id: nextId, city: lead?.city || 'Bangalore', zone: '', specialty: lead?.specialty || 'General Dentistry', position: 1, duration: '6', quantity: 1, price: 10000, availableSlots: 3, totalSlots: 3 },
    ]);
  };

  const handleRemoveReachBlock = (id) => {
    setReachBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCopyPitch = () => {
    if (!aiPitch) return;
    navigator.clipboard.writeText(aiPitch.openingPitch);
    alert('✨ AI pitch copied to clipboard!');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello ${lead?.name || 'Doctor'}, here is the commercial proposal summary from Practo Technologies for ${clientName}:\n\n` +
      `• Document: ${docType}\n` +
      `• Total Amount (incl. 18% GST): ₹${fmt(invoiceTotal)}\n` +
      `${includeTds ? `• Net Amount (after ${tdsPct}% TDS): ₹${fmt(netPayable)}\n` : ''}` +
      `• Bank: HDFC Bank (A/C: ${PRACTO_BANK.accNo} | IFSC: ${PRACTO_BANK.ifsc})\n\n` +
      `Please let us know if you need any adjustments.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${(lead?.phone || '').replace(/[^0-9]/g, '')}&text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Practo Technologies — ${docType} for ${clientName}`);
    const body = encodeURIComponent(
      `Dear ${lead?.name || 'Doctor'},\n\nPlease find attached the ${docType} from Practo Technologies.\n\n` +
      `Total Invoice Value: INR ${fmt(invoiceTotal)}\n` +
      `${includeTds ? `Net Payable to Practo: INR ${fmt(netPayable)}\n` : ''}\n` +
      `Beneficiary: Practo Technologies Pvt. Ltd.\nBank: HDFC Bank, JP Nagar, Bangalore\nAccount No: ${PRACTO_BANK.accNo}\nIFSC: ${PRACTO_BANK.ifsc}\n\nWarm regards,\nPracto Sales Team`
    );
    window.open(`mailto:${lead?.email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const isProforma = docType === 'PROFORMA INVOICE';

  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: '85vh', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* ── LEFT PANEL: CONFIGURATION SUITE ────────────────────────────── */}
      <div style={{ flex: '1 1 440px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '88vh', paddingRight: '6px' }}>
        
        {/* AI Deal Copilot Card (Matches VV1 styling) */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', color: '#FFFFFF', padding: '20px', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🤖 AI Deal Copilot & Pitch Generator
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#E0E7FF' }}>
            {hasPrime || hasReach
              ? (aiPitch?.openingPitch.substring(0, 190) + '...' || 'Proposal configured with live yield metrics.')
              : 'Select products below to generate AI deal score, yield metrics, and custom doctor pitches.'}
          </div>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '12px', color: '#34D399' }}>
              Deal Score: {dealScore}/100
            </div>
            <button
              onClick={handleCopyPitch}
              disabled={!hasPrime && !hasReach}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              📋 Copy AI Pitch
            </button>
          </div>
        </div>

        {/* Document Type Selector */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <label style={labelStyle}>Document Type</label>
          <select
            className="select-field"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{ ...inputStyle, fontWeight: 800, color: '#28328C', fontSize: '13.5px' }}
          >
            <option value="PROPOSAL">Commercial Proposal</option>
            <option value="PROFORMA INVOICE">Proforma Invoice</option>
          </select>
        </div>

        {/* Proforma Configuration Section */}
        {isProforma && (
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#28328C', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Proforma Invoice Metadata
            </h4>
            <div>
              <label style={labelStyle}>Proforma Invoice No.</label>
              <input style={inputStyle} value={invNo} onChange={(e) => setInvNo(e.target.value)} placeholder="July/2026/PI/23" />
            </div>
            <div>
              <label style={labelStyle}>Purchaser / Client Company Name</label>
              <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Purchaser PAN</label>
                <input style={inputStyle} value={clientPan} onChange={(e) => setClientPan(e.target.value)} placeholder="AACCN8042Q" />
              </div>
              <div>
                <label style={labelStyle}>Purchaser GSTIN</label>
                <input style={inputStyle} value={clientGst} onChange={(e) => setClientGst(e.target.value)} placeholder="29AACCN8042Q1ZS" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Purchaser Address</label>
              <textarea
                style={{ ...inputStyle, minHeight: '50px' }}
                value={clientAddr}
                onChange={(e) => setClientAddr(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Service Category</label>
                <input style={inputStyle} value={serviceCat} onChange={(e) => setServiceCat(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>SAC Code</label>
                <input style={inputStyle} value={sacCode} onChange={(e) => setSacCode(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Product Selection Toggles */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>
            Product Suite Selection
          </div>

          {/* Practo Prime Toggle Card */}
          <div style={{ border: `1.5px solid ${hasPrime ? '#00A3C4' : '#E2E8F0'}`, borderRadius: '10px', padding: '14px', background: hasPrime ? 'rgba(0,163,196,0.04)' : '#FFFFFF', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setHasPrime(!hasPrime)}>
              <input type="checkbox" checked={hasPrime} onChange={(e) => setHasPrime(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#00A3C4', cursor: 'pointer' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>⭐ Practo Prime</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Premium Appointment Technology</p>
              </div>
            </div>

            {hasPrime && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Prime Product Variant</label>
                  <select style={inputStyle} value={primeVariant} onChange={(e) => setPrimeVariant(e.target.value)}>
                    <option value="supreme">Prime Supreme (Call + Book Charges)</option>
                    <option value="ai">Prime AI (PFC Charges)</option>
                  </select>
                </div>

                {primeVariant === 'supreme' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Call Charges (₹ / conn)</label>
                      <input style={inputStyle} type="number" value={callCharge} onChange={(e) => setCallCharge(parseFloat(e.target.value) || 0)} placeholder="250" />
                    </div>
                    <div>
                      <label style={labelStyle}>Book Charges (₹ / conn)</label>
                      <input style={inputStyle} type="number" value={bookCharge} onChange={(e) => setBookCharge(parseFloat(e.target.value) || 0)} placeholder="300" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>PFC Charges (₹ / unique connection)</label>
                    <input style={inputStyle} type="number" value={pfcCharge} onChange={(e) => setPfcCharge(parseFloat(e.target.value) || 0)} placeholder="350" />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Prime Subscription Wallet Amount (₹)</label>
                  <input style={inputStyle} type="number" value={primeAmount || ''} onChange={(e) => setPrimeAmount(parseFloat(e.target.value) || 0)} placeholder="e.g. 15000" />
                </div>
              </div>
            )}
          </div>

          {/* Practo Reach Toggle Card */}
          <div style={{ border: `1.5px solid ${hasReach ? '#28328C' : '#E2E8F0'}`, borderRadius: '10px', padding: '14px', background: hasReach ? 'rgba(40,50,140,0.03)' : '#FFFFFF', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setHasReach(!hasReach)}>
              <input type="checkbox" checked={hasReach} onChange={(e) => setHasReach(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#28328C', cursor: 'pointer' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>📍 Practo Reach Spotlight</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Targeted Visibility & Slot Campaigns</p>
              </div>
            </div>

            {hasReach && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
                {reachBlocks.map((b) => (
                  <ReachCampaignBlock
                    key={b.id}
                    id={b.id}
                    block={b}
                    onChange={handleReachChange}
                    onRemove={handleRemoveReachBlock}
                    inventoryData={inventoryData}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAddReachBlock}
                  style={{ width: '100%', padding: '10px', background: '#EEF2FF', border: '1px dashed #6366F1', color: '#4F46E5', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add Another Reach Campaign
                </button>
              </div>
            )}
          </div>

          {/* Video Shoot Toggle Card */}
          <div style={{ border: `1.5px solid ${hasVideo ? '#0D9488' : '#E2E8F0'}`, borderRadius: '10px', padding: '14px', background: hasVideo ? 'rgba(13,148,136,0.04)' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setHasVideo(!hasVideo)}>
            <input type="checkbox" checked={hasVideo} onChange={(e) => setHasVideo(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0D9488', cursor: 'pointer' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>🎬 Professional Video Shoot</h4>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Complimentary On-Site Clinic Profile Video</p>
            </div>
          </div>
        </div>

        {/* Commercial & Discount Details */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>
            Commercial & Tax Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Discount (%)</label>
              <input style={inputStyle} type="number" value={discountPct} onChange={(e) => handleDiscountPctChange(e.target.value)} min="0" max="100" />
            </div>
            <div>
              <label style={labelStyle}>Discount / Month (₹)</label>
              <input style={inputStyle} type="number" value={discountAmtPerMonth} onChange={(e) => handleDiscountAmtChange(e.target.value)} min="0" />
            </div>
            <div>
              <label style={labelStyle}>GST Rate (%)</label>
              <input style={inputStyle} type="number" value={taxPct} onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label style={labelStyle}>TDS Rate (%)</label>
              <input style={inputStyle} type="number" value={tdsPct} onChange={(e) => setTdsPct(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input type="checkbox" id="chk-show-tds" checked={includeTds} onChange={(e) => setIncludeTds(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#28328C' }} />
            <label htmlFor="chk-show-tds" style={{ fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              Show TDS deduction on PDF
            </label>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: LIVE DOCUMENT PREVIEW (1:1 with VV1 Final Version) ── */}
      <div style={{ flex: '1 1 540px', overflowY: 'auto', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '800px', marginBottom: '16px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={handleWhatsAppShare} className="btn" style={{ background: '#10B981', color: '#FFF', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💬 WhatsApp
          </button>
          <button onClick={handleEmailShare} className="btn" style={{ background: '#6366F1', color: '#FFF', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📧 Email Client
          </button>
          <button onClick={handlePrintPDF} className="btn" style={{ background: '#28328C', color: '#FFF', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📄 Export PDF
          </button>
        </div>

        {/* Invoice / Proposal Sheet Container */}
        <div
          id="invoiceContent"
          style={{
            width: '100%',
            maxWidth: '800px',
            background: '#FFFFFF',
            padding: '40px 48px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            marginBottom: '40px',
            color: '#0F172A',
          }}
        >
          {/* Document Header with Official Practo Logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #28328C', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <PractoLogo size="lg" variant="full" />
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, marginTop: '8px' }}>
                Practo Technologies Private Limited
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#28328C', letterSpacing: '-0.5px', margin: 0, textTransform: 'uppercase' }}>
                {docType}
              </h2>
              <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: '12.5px', fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Proforma Metadata Grid */}
          {isProforma && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h5 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#28328C', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                    Seller Information
                  </h5>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Company:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_COMPANY.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>TAN:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_COMPANY.tan}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>CIN:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_COMPANY.cin}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>PAN:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_COMPANY.pan}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_COMPANY.gstin}</span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: '4px', lineHeight: 1.4 }}>
                    <strong>Address:</strong> {PRACTO_COMPANY.address}
                  </div>
                </div>

                <div>
                  <h5 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#28328C', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                    Purchaser Information
                  </h5>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Invoice To:</span>
                    <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '200px' }}>{clientName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>PAN:</span>
                    <span style={{ fontWeight: 700 }}>{clientPan}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontWeight: 700 }}>{clientGst}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Service Cat:</span>
                    <span style={{ fontWeight: 700 }}>{serviceCat}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Invoice No:</span>
                    <span style={{ fontWeight: 700 }}>{invNo}</span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: '4px', lineHeight: 1.4 }}>
                    <strong>Address:</strong> {clientAddr}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Included Scope of Services (Matches VV1 styling) */}
          {(hasPrime || hasReach || hasVideo) && (
            <div style={{ background: '#F8FAFC', padding: '20px 24px', borderRadius: '8px', marginBottom: '28px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#28328C', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Included Scope of Services
              </h4>
              {hasPrime && (
                <div style={{ marginBottom: '10px', fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <strong style={{ color: '#0F172A' }}>Practo Prime ({primeVariant === 'supreme' ? 'Supreme' : 'AI'}): </strong>
                  {primeVariant === 'supreme'
                    ? `Includes comprehensive IVR call routing & verified appointment booking technology with real-time Practo Pro integration.`
                    : `Includes intelligent PFC-based connection matching & instant digital patient engagement.`}
                </div>
              )}
              {hasReach && (
                <div style={{ marginBottom: '10px', fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <strong style={{ color: '#0F172A' }}>Practo Reach Spotlight: </strong>
                  High-impact targeted banner placement in selected locality & specialty with guaranteed impression delivery & Share of Slot (SoS) allocation.
                </div>
              )}
              {hasVideo && (
                <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <strong style={{ color: '#0F172A' }}>Professional Clinic Profile Shoot: </strong>
                  Complimentary HD video walkthrough and professional high-resolution clinic photography produced by Practo Studio team for profile branding.
                </div>
              )}
            </div>
          )}

          {/* Empty State when no products configured */}
          {!hasPrime && !hasReach && !hasVideo ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📄</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Live Document Preview</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>Select products and configure details on the left to generate the proposal in real-time.</p>
            </div>
          ) : (
            <>
              {/* Itemized Table (Exact VV1 Table Format) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#28328C', color: '#FFFFFF', padding: '12px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60%' }}>
                      Item Description
                    </th>
                    {isProforma && (
                      <th style={{ background: '#28328C', color: '#FFFFFF', padding: '12px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '15%' }}>
                        SAC Code
                      </th>
                    )}
                    <th style={{ background: '#28328C', color: '#FFFFFF', padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>
                      Taxable Value (INR)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hasPrime && (
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>Practo Prime ({primeVariant === 'supreme' ? 'Supreme' : 'AI'})</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {primeVariant === 'supreme' ? `Call Charges: ₹${callCharge}/conn | Booking Charges: ₹${bookCharge}/conn` : `PFC Rate: ₹${pfcCharge}/connection`}
                        </div>
                      </td>
                      {isProforma && <td style={{ padding: '12px 14px', color: '#64748B', fontWeight: 600 }}>{sacCode}</td>}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{fmt(primeAmount)}</td>
                    </tr>
                  )}

                  {hasReach && reachBlocks.map((b, idx) => {
                    if (!b.price || !b.quantity) return null;
                    const blockTotal = b.price * (parseInt(b.duration, 10) || 3) * b.quantity;
                    const sovText = `${b.quantity} of ${b.totalSlots || 3} Slots (${Math.round((b.quantity / (b.totalSlots || 3)) * 100)}% SoS)`;
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>
                            Practo Reach Spotlight{reachBlocks.length > 1 ? ` (Campaign #${idx + 1})` : ''}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                            {b.city} • {b.zone} • {b.specialty} • Position {b.position}<br />
                            Duration: {b.duration} Months @ ₹{fmt(b.price)}/mo per slot | <strong style={{ color: '#00A3C4' }}>Share of Slot: {sovText}</strong>
                          </div>
                        </td>
                        {isProforma && <td style={{ padding: '12px 14px', color: '#64748B', fontWeight: 600 }}>{sacCode}</td>}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{fmt(blockTotal)}</td>
                      </tr>
                    );
                  })}

                  {hasVideo && (
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>Professional Clinic Profile Video Shoot</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Exclusive On-Site High-Definition Shoot & Photography</div>
                      </td>
                      {isProforma && <td style={{ padding: '12px 14px', color: '#64748B', fontWeight: 600 }}>{sacCode}</td>}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0D9488' }}>Complimentary</td>
                    </tr>
                  )}

                  {/* Summary Rows */}
                  <tr style={{ background: '#F8FAFC' }}>
                    <td colSpan={isProforma ? 2 : 1} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                      {isProforma ? 'Total Amount Excluding GST —' : 'Gross Value'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{fmt(taxableBaseAmount)}</td>
                  </tr>

                  {discountTotalAmount > 0 && !isProforma && (
                    <tr>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                        Applied Discount ({discountPct}% on Reach Products)
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                        - ₹{fmt(discountTotalAmount)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td colSpan={isProforma ? 2 : 1} style={{ padding: '8px 14px', textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                      {isProforma ? `Total Amount including GST ${taxPct}% —` : `GST (${taxPct}%)`}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                      {isProforma ? `₹${fmt(invoiceTotal)}` : `₹${fmt(gstAmount)}`}
                    </td>
                  </tr>

                  {!isProforma && (
                    <tr style={{ background: '#EEF2FF' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#28328C' }}>
                        TOTAL INVOICE VALUE (Incl. GST)
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: '#28328C' }}>
                        ₹ {fmt(invoiceTotal)}
                      </td>
                    </tr>
                  )}

                  {includeTds && (
                    <>
                      <tr>
                        <td colSpan={isProforma ? 2 : 1} style={{ padding: '8px 14px', textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                          TDS — {tdsPct}%
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                          ₹{fmt(tdsAmount)}
                        </td>
                      </tr>
                      <tr style={{ background: '#ECFDF5' }}>
                        <td colSpan={isProforma ? 2 : 1} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#065F46' }}>
                          {isProforma ? 'Payable Amount' : 'NET PAYABLE TO PRACTO'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: '16px', color: '#065F46' }}>
                          ₹ {fmt(netPayable)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Bank Details Box (Matches VV1 styling) */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginTop: '24px', fontSize: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#28328C', marginBottom: '8px', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                  Practo Bank Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Beneficiary Name:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_BANK.beneficiary}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Bank:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_BANK.bank}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Acc No:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_BANK.accNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>IFSC:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_BANK.ifsc}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Acc Type:</span>
                    <span style={{ fontWeight: 700 }}>{PRACTO_BANK.accType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Payment Link:</span>
                    <span style={{ fontWeight: 700, color: '#00A3C4' }}>{PRACTO_BANK.payLink}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div style={{ marginTop: '24px', padding: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Terms & Conditions
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#64748B', fontSize: '11px', lineHeight: 1.6 }}>
                  {DEFAULT_TNC.map((t, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Footer Acceptance Note */}
              <div style={{ marginTop: '20px', color: '#64748B', fontSize: '11.5px', borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>Thank you for choosing Practo Healthcare Solutions.</div>
                <div style={{ fontWeight: 700, color: '#28328C' }}>
                  Authorized Signatory • Practo Technologies Pvt. Ltd.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoiceContent, #invoiceContent * { visibility: visible !important; }
          #invoiceContent { position: absolute; left: 0; top: 0; width: 100%; max-width: 100% !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
