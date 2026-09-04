import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import PractoLogo from '../components/PractoLogo.jsx';

const DEFAULT_TNC = `This commercial proposal is valid for 15 days from the date of issue.
Services will be activated post realization of 100% advance payment.
All reach visibility and digital assets are subject to Practo's standard content guidelines and approval processes.
TDS (Tax Deducted at Source) must be deducted and deposited by the client as per applicable Income Tax slabs.
Final agreements are governed strictly by Practo's Terms of Service available on the official website.`;

const PROFORMA_TNC_TEXT = `Note: This is not a GST invoice, input GST credit cannot be taken based on Proforma Invoice or Purchase Order.`;

const DEFAULT_SCOPE_PRIME = `A premium technology product that delivers an exceptional patient experience. It guarantees assured appointments, minimal in-clinic wait times, 24x7 instant online booking, and a dedicated Prime visibility badge to elevate your clinic's premium reputation across the Practo network.`;

const DEFAULT_SCOPE_REACH = `A targeted digital visibility solution that secures top-tier placement for your clinic on Practo's highly trafficked search engine. By hyper-targeting specific specialities and local zones, it maximizes patient discovery, engagement, and direct footfall.`;

const DEFAULT_SCOPE_VIDEO = `A complimentary on-site professional video and photo shoot designed to showcase your clinic's infrastructure and doctor profiles, instantly building patient trust and enhancing your digital presence.`;

function formatCurrency(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProposalSuitePage() {
  // Master catalog from Reach Inventory Service
  const [catalogCities, setCatalogCities] = useState([]);

  // Document Configuration
  const [docType, setDocType] = useState('PROPOSAL'); // 'PROPOSAL' | 'PROFORMA INVOICE'
  const [invoiceDate] = useState(() =>
    new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  );

  // Proforma Metadata
  const [profInvNo, setProfInvNo] = useState('July/2026/PI/23');
  const [profClientName, setProfClientName] = useState('');
  const [profClientPan, setProfClientPan] = useState('');
  const [profClientGst, setProfClientGst] = useState('');
  const [profClientAddr, setProfClientAddr] = useState('');
  const [profServiceCat, setProfServiceCat] = useState('Information Technology Software');
  const [profSacCode, setProfSacCode] = useState('998313');

  // Product Selection Toggles
  const [hasPrime, setHasPrime] = useState(false);
  const [primeVariant, setPrimeVariant] = useState('supreme'); // 'supreme' | 'ai'
  const [primeCallCharge, setPrimeCallCharge] = useState(250);
  const [primeBookCharge, setPrimeBookCharge] = useState(300);
  const [primePfcCharge, setPrimePfcCharge] = useState(350);
  const [primeAmount, setPrimeAmount] = useState(15000);

  const [hasReach, setHasReach] = useState(false);
  const [reachBlocks, setReachBlocks] = useState([]);

  const [hasVideo, setHasVideo] = useState(false);

  // Commercials & Taxes
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(18);
  const [tdsPercent, setTdsPercent] = useState(2);
  const [includeTds, setIncludeTds] = useState(true);

  // App & Seller Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({
    name: 'Karan Patel',
    phone: '+91 98765 43210',
    email: 'karan@practo.com',
    sellerName: 'Practo Technologies Pvt. Ltd.',
    sellerTan: 'BLRN05947E',
    sellerCin: 'U72900KA2008PTC046374',
    sellerPan: 'AACCN8042Q',
    sellerGst: '29AAICC3651Q1Z0',
    sellerAddr: 'First Floor, No.275 13th Cross Road, 19th Main Road, HSR Layout 4th Sector, Bengaluru Urban, Karnataka - 560102',
    beneName: 'Practo Technologies Pvt. Ltd.',
    bankName: 'HDFC, JP Nagar, Bangalore',
    accNo: '01332320001144',
    ifsc: 'HDFC0000133',
    accType: 'Current',
    payLink: 'https://payment.practo.com/pay',
    tnc: DEFAULT_TNC,
    scopePrime: DEFAULT_SCOPE_PRIME,
    scopeReach: DEFAULT_SCOPE_REACH,
    scopeVideo: DEFAULT_SCOPE_VIDEO,
    waTemp: `*Practo Official Commercial Summary*\n\nDear Doctor,\nHere is the custom proposal summary for your clinic:\n\n*Services Included:*\n[ITEMS]\n*Final Investment Amount:* ₹[NET_AMOUNT]\n\nPlease let me know if you have any questions.\n\nBest Regards,\n[SENDER_NAME]\nPracto Enterprise Team`,
    emailTemp: `Dear Doctor,\n\nThank you for taking the time to discuss Practo's digital solutions for your clinic.\n\nSummary of Services:\n[ITEMS]\nNet Payable Amount: ₹[NET_AMOUNT]\n\nPlease review the proposal and reply if you have any questions.\n\nBest Regards,\n[SENDER_NAME]\nPracto Enterprise Team`,
  });

  const [aiPitch, setAiPitch] = useState('');
  const [dealScore, setDealScore] = useState(0);
  const [copyStatus, setCopyStatus] = useState(false);

  const invoiceRef = useRef(null);

  // Initialize catalog and query param pre-fills on mount
  useEffect(() => {
    api.getInventoryCities().then((cities) => {
      setCatalogCities(cities || []);
    }).catch(() => {});

    // Read URL query parameters for direct slot / clinic pre-fill
    const params = new URLSearchParams(window.location.search);
    const qDoc = params.get('doctor');
    const qClinic = params.get('clinic');
    const qCity = params.get('city');
    const qZone = params.get('zone');
    const qSlot = params.get('slot');

    if (qClinic || qDoc) {
      setProfClientName(qClinic || qDoc || '');
    }

    if (qSlot || qZone) {
      setHasReach(true);
      addReachCampaign({
        city: qCity || 'Bangalore',
        zone: qZone || '',
        speciality: qSlot || '',
        position: '1',
        term: '3',
        price: 9450,
      });
    } else {
      // Initialize with one empty reach campaign block
      addReachCampaign();
    }
  }, []); // eslint-disable-line

  // Add Reach Campaign Block
  function addReachCampaign(initData = {}) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newBlock = {
      id,
      city: initData.city || 'Bangalore',
      zone: initData.zone || '',
      speciality: initData.speciality || '',
      position: initData.position || '1',
      term: initData.term || '3',
      price: initData.price || 0,
      qty: 1,
      totalSlots: 2,
      availableSlots: 1,
      zones: [],
      specialities: [],
      status: 'Awaiting selection...',
    };

    // Preload zones for default city
    api.getInventoryZones(newBlock.city).then((z) => {
      newBlock.zones = z || [];
      if (newBlock.zone) {
        api.getInventorySpecialities(newBlock.city, newBlock.zone).then((s) => {
          newBlock.specialities = s || [];
          lookupSlotPrice(newBlock);
        });
      }
    }).catch(() => {});

    setReachBlocks((prev) => [...prev, newBlock]);
  }

  function removeReachCampaign(id) {
    setReachBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function updateReachBlock(id, updates) {
    setReachBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, ...updates };

        if (updates.city && updates.city !== b.city) {
          updated.zone = '';
          updated.speciality = '';
          updated.price = 0;
          api.getInventoryZones(updates.city).then((z) => {
            updateReachBlock(id, { zones: z || [], zone: '', specialities: [] });
          });
        } else if (updates.zone && updates.zone !== b.zone) {
          updated.speciality = '';
          updated.price = 0;
          api.getInventorySpecialities(updated.city, updates.zone).then((s) => {
            updateReachBlock(id, { specialities: s || [], speciality: '' });
          });
        } else if (updates.speciality || updates.position || updates.term) {
          lookupSlotPrice(updated);
        }

        return updated;
      })
    );
  }

  function lookupSlotPrice(block) {
    if (!block.city || !block.zone || !block.speciality) return;

    api.searchInventory({
      city: block.city,
      zone: block.zone,
      speciality: block.speciality,
      position: block.position,
      limit: 10,
    }).then((results) => {
      if (results && results.length > 0) {
        const r = results[0];
        const termKey = block.term === '12' ? 'price12M' : block.term === '6' ? 'price6M' : 'price3M';
        const foundPrice = r[termKey] || r.price3M || 0;
        setReachBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id
              ? {
                  ...b,
                  price: foundPrice,
                  totalSlots: r.totalSlots || 2,
                  availableSlots: r.availableSlots || 1,
                  status: r.availableSlots > 0 ? '✓ Active' : '✕ Sold Out',
                }
              : b
          )
        );
      }
    }).catch(() => {});
  }

  // Calculate Reach Monthly Sum
  const reachMonthlyTotal = reachBlocks.reduce((sum, b) => {
    if (hasReach && b.city && b.zone && b.speciality && b.price > 0 && b.qty > 0) {
      return sum + b.price * b.qty;
    }
    return sum;
  }, 0);

  // Bidirectional sync: Discount Amount -> Discount %
  function handleDiscountAmountChange(amt) {
    const n = Math.max(0, parseFloat(amt) || 0);
    setDiscountAmount(n);
    if (reachMonthlyTotal > 0) {
      const pct = Math.min(100, (n / reachMonthlyTotal) * 100);
      setDiscountPercent(parseFloat(pct.toFixed(2)));
    } else {
      setDiscountPercent(0);
    }
  }

  // Bidirectional sync: Discount % -> Discount Amount
  function handleDiscountPercentChange(pct) {
    const p = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    setDiscountPercent(p);
    const amt = reachMonthlyTotal * (p / 100);
    setDiscountAmount(parseFloat(amt.toFixed(2)));
  }

  // --- Financial Computations ---
  let primeTotal = hasPrime ? (parseFloat(primeAmount) || 0) : 0;
  let reachTotal = 0;
  let maxDur = 3;

  const reachSummaryItems = [];
  if (hasReach) {
    reachBlocks.forEach((b) => {
      const dur = parseInt(b.term, 10) || 3;
      if (dur > maxDur) maxDur = dur;
      if (b.city && b.zone && b.speciality && b.price > 0 && b.qty > 0) {
        const blockTotal = b.price * dur * b.qty;
        reachTotal += blockTotal;
        const sovText = `${b.qty} of ${b.totalSlots} Slots (${Math.round((b.qty / b.totalSlots) * 100)}% Share of Slot)`;
        reachSummaryItems.push({
          ...b,
          dur,
          blockTotal,
          sovText,
        });
      }
    });
  }

  const subtotal = primeTotal + reachTotal;
  // Discount applies strictly to Reach products
  const discAmt = reachTotal * (discountPercent / 100);
  const baseAmt = Math.max(0, subtotal - discAmt);
  const taxAmt = baseAmt * (taxPercent / 100);
  const invTotal = baseAmt + taxAmt;
  const tdsAmt = baseAmt * (tdsPercent / 100);
  const netPayable = includeTds ? Math.max(0, invTotal - tdsAmt) : invTotal;

  // --- Live AI Pitch Generator ---
  useEffect(() => {
    if (!hasPrime && !hasReach) {
      setAiPitch('');
      setDealScore(0);
      return;
    }

    let score = 50;
    if (maxDur === 12) score += 30;
    else if (maxDur === 6) score += 15;
    else score -= 10;

    if (hasPrime) score += 20;
    if (discountPercent <= 10) score += 10;
    else score -= 15;

    score = Math.max(0, Math.min(100, score));
    setDealScore(score);

    const productFocus = [];
    if (hasPrime) productFocus.push('Practo Prime for streamlined patient scheduling and minimal in-clinic wait times');
    if (hasReach) productFocus.push('Practo Reach Spotlight to secure top-tier local visibility');

    const generated = `Hello Doctor, following our discussion on elevating your clinic's digital presence, we have curated a custom growth package featuring ${productFocus.join(
      ' and '
    )}. With a ${maxDur}-month commitment, this structure ensures robust patient acquisition and practice efficiency for an investment of ₹${formatCurrency(
      netPayable
    )} (all-inclusive). Let’s confirm this to secure your spotlight positions today!`;

    setAiPitch(generated);
  }, [hasPrime, hasReach, maxDur, discountPercent, netPayable]);

  function copyAiPitch() {
    if (!aiPitch) return;
    navigator.clipboard.writeText(aiPitch).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2500);
    });
  }

  // --- Export PDF ---
  function exportPdf() {
    const el = invoiceRef.current;
    if (!el || (!hasPrime && !hasReach && !hasVideo)) {
      alert('Please configure at least one product before exporting.');
      return;
    }

    const filename = docType === 'PROFORMA INVOICE' ? 'Practo_Proforma_Invoice.pdf' : 'Practo_Commercial_Proposal.pdf';

    if (window.html2pdf) {
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.invoice-header', '.proforma-meta-box', '.product-overview', '.bank-details-box', '.tnc-section', '.footer-note'] },
      };
      window.html2pdf().set(opt).from(el).save();
    } else {
      window.print();
    }
  }

  // --- Share WhatsApp & Email ---
  function getShareItemsText() {
    let text = '';
    if (hasPrime) {
      text += primeVariant === 'supreme'
        ? `• Practo Prime Supreme (Call: ₹${primeCallCharge}, Book: ₹${primeBookCharge})\n`
        : `• Practo Prime AI (PFC: ₹${primePfcCharge})\n`;
    }
    if (hasReach) {
      reachSummaryItems.forEach((b) => {
        text += `• Reach Campaign: ${b.city} | ${b.zone} | ${b.speciality} (${b.dur}M | ${b.qty} Slot(s))\n`;
      });
    }
    if (hasVideo) {
      text += `• Complimentary Professional Profile Video Shoot\n`;
    }
    return text;
  }

  function shareWhatsApp() {
    const items = getShareItemsText();
    if (!items) {
      alert('Please configure a proposal first.');
      return;
    }
    const msg = appSettings.waTemp
      .replace(/\[ITEMS\]/g, items)
      .replace(/\[NET_AMOUNT\]/g, formatCurrency(netPayable))
      .replace(/\[SENDER_NAME\]/g, appSettings.name || 'Practo Enterprise Team');

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function shareEmail() {
    const items = getShareItemsText();
    if (!items) {
      alert('Please configure a proposal first.');
      return;
    }
    const body = appSettings.emailTemp
      .replace(/\[ITEMS\]/g, items)
      .replace(/\[NET_AMOUNT\]/g, formatCurrency(netPayable))
      .replace(/\[SENDER_NAME\]/g, appSettings.name || 'Practo Enterprise Team');

    const subject = encodeURIComponent('Commercial Proposal - Practo Healthcare Solutions');
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
  }

  const isProforma = docType === 'PROFORMA INVOICE';
  const hasSelectedProducts = hasPrime || hasReach || hasVideo;

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar Header */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <PractoLogo size="sm" showTagline={false} />
          <div style={{ height: 20, width: 1, backgroundColor: '#E2E8F0' }} />
          <span style={{ color: '#64748B', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enterprise Commercial Suite
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 700 }}>
            ● Live Catalog Active ({catalogCities.length} Cities)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSettingsOpen(true)}
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            ⚙️ System Settings
          </button>
        </div>
      </div>

      {/* Main SaaS Split-Pane Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* LEFT PANEL: CONFIGURATION */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            width: 500,
            background: '#F8FAFC',
            borderRight: '1px solid #E2E8F0',
            overflowY: 'auto',
            padding: 24,
            flexShrink: 0,
          }}
        >
          {/* AI Deal Copilot & Pitch Generator Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              color: '#FFFFFF',
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              🤖 AI Deal Copilot & Pitch Generator
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, fontWeight: 500 }}>
              {aiPitch ? `"${aiPitch.substring(0, 140)}..."` : 'Configure proposal to generate AI insights and custom pitches.'}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {dealScore > 0 && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontWeight: 800,
                    fontSize: 12,
                    color: dealScore >= 75 ? '#A7F3D0' : '#FDE68A',
                  }}
                >
                  Deal Score: {dealScore}/100
                </div>
              )}
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', padding: '5px 12px', fontSize: 11 }}
                onClick={copyAiPitch}
                disabled={!aiPitch}
              >
                {copyStatus ? '✓ Copied!' : '📋 Copy AI Pitch'}
              </button>
            </div>
          </div>

          {/* Product Selection */}
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>
            Product Selection
          </div>

          {/* 1. Practo Prime Toggle Card */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: hasPrime ? '#EEF2FF' : '#FFFFFF', padding: 14, marginBottom: 12, transition: '0.2s' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasPrime}
                onChange={(e) => setHasPrime(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#4F46E5', cursor: 'pointer' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Practo Prime</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>Premium Appointment Technology & Guaranteed Minimal Wait Times</p>
              </div>
            </label>

            {hasPrime && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #CBD5E1' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                    Prime Product Variant
                  </label>
                  <select
                    className="input"
                    value={primeVariant}
                    onChange={(e) => setPrimeVariant(e.target.value)}
                  >
                    <option value="supreme">Prime Supreme</option>
                    <option value="ai">Prime AI</option>
                  </select>
                </div>

                {primeVariant === 'supreme' ? (
                  <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                        Call Charges (₹ / conn.)
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={primeCallCharge}
                        onChange={(e) => setPrimeCallCharge(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                        Book Charges (₹ / conn.)
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={primeBookCharge}
                        onChange={(e) => setPrimeBookCharge(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      PFC Charges (₹ / unique connection)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={primePfcCharge}
                      onChange={(e) => setPrimePfcCharge(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                    Prime Subscription Wallet Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={primeAmount}
                    onChange={(e) => setPrimeAmount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Practo Reach Toggle Card */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: hasReach ? '#EEF2FF' : '#FFFFFF', padding: 14, marginBottom: 12, transition: '0.2s' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasReach}
                onChange={(e) => setHasReach(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#4F46E5', cursor: 'pointer' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Practo Reach</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>Targeted Visibility & Spotlight Placement Campaigns</p>
              </div>
            </label>

            {hasReach && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #CBD5E1' }}>
                {reachBlocks.map((block, idx) => (
                  <div
                    key={block.id}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: 12,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em' }}>
                        Campaign Configuration {idx + 1}
                      </span>
                      {reachBlocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReachCampaign(block.id)}
                          style={{ background: 'none', border: 'none', color: '#E11D48', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="grid-2" style={{ gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>City</label>
                        <select
                          className="input"
                          value={block.city}
                          onChange={(e) => updateReachBlock(block.id, { city: e.target.value })}
                        >
                          {catalogCities.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Zone</label>
                        <select
                          className="input"
                          value={block.zone}
                          onChange={(e) => updateReachBlock(block.id, { zone: e.target.value })}
                        >
                          <option value="">-- Select Zone --</option>
                          {block.zones.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Speciality</label>
                        <select
                          className="input"
                          value={block.speciality}
                          onChange={(e) => updateReachBlock(block.id, { speciality: e.target.value })}
                        >
                          <option value="">-- Select Speciality --</option>
                          {block.specialities.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Position</label>
                        <select
                          className="input"
                          value={block.position}
                          onChange={(e) => updateReachBlock(block.id, { position: e.target.value })}
                        >
                          <option value="1">Position 1 (Spotlight Top Banner)</option>
                          <option value="6">Position 6 (Mid-Page Spotlight)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0', marginTop: 8 }}>
                      <div className="grid-2" style={{ gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Term</label>
                          <select
                            className="input"
                            value={block.term}
                            onChange={(e) => updateReachBlock(block.id, { term: e.target.value })}
                          >
                            <option value="3">3 Months</option>
                            <option value="6">6 Months</option>
                            <option value="12">12 Months</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Available Slots (%)</label>
                          <div style={{ padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: '#0D9488' }}>
                            {block.availableSlots} of {block.totalSlots} Slots ({Math.round((block.availableSlots / block.totalSlots) * 100)}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid-2" style={{ gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>
                            Base Price (₹/mo) <span style={{ color: '#0D9488', fontSize: 10 }}>[Editable]</span>
                          </label>
                          <input
                            type="number"
                            className="input"
                            value={block.price}
                            onChange={(e) => updateReachBlock(block.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Share of Slot</label>
                          <select
                            className="input"
                            value={block.qty}
                            onChange={(e) => updateReachBlock(block.id, { qty: parseInt(e.target.value, 10) || 1 })}
                          >
                            {Array.from({ length: block.availableSlots || 1 }).map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} Slot{i > 0 ? 's' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addReachCampaign()}
                  style={{
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px dashed #4F46E5',
                    padding: 9,
                    width: '100%',
                    fontWeight: 700,
                    fontSize: 12,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  + Add Another Reach Campaign
                </button>
              </div>
            )}
          </div>

          {/* 3. Video Shoot Toggle Card */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: hasVideo ? '#EEF2FF' : '#FFFFFF', padding: 14, marginBottom: 20, transition: '0.2s' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasVideo}
                onChange={(e) => setHasVideo(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#4F46E5', cursor: 'pointer' }}
              />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 14, color: '#0F172A', fontWeight: 800 }}>Video Shoot</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>Complimentary On-Site Professional Profile & Clinic Shoot</p>
              </div>
            </label>
          </div>

          {/* Commercial & Document Details */}
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>
            Commercial & Document Details
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Document Type</label>
              <select
                className="input"
                value={docType}
                onChange={(e) => {
                  const val = e.target.value;
                  setDocType(val);
                  if (val === 'PROFORMA INVOICE') {
                    setAppSettings((s) => ({ ...s, tnc: PROFORMA_TNC_TEXT }));
                  } else {
                    setAppSettings((s) => ({ ...s, tnc: DEFAULT_TNC }));
                  }
                }}
              >
                <option value="PROPOSAL">Commercial Proposal</option>
                <option value="PROFORMA INVOICE">Proforma Invoice</option>
              </select>
            </div>

            {/* Proforma Specific Form Fields */}
            {isProforma && (
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Proforma Invoice No.</label>
                  <input className="input" value={profInvNo} onChange={(e) => setProfInvNo(e.target.value)} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Purchaser / Client Company Name</label>
                  <input className="input" value={profClientName} onChange={(e) => setProfClientName(e.target.value)} placeholder="e.g. Apollo Clinic Indiranagar" />
                </div>
                <div className="grid-2" style={{ gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Purchaser PAN</label>
                    <input className="input" value={profClientPan} onChange={(e) => setProfClientPan(e.target.value)} placeholder="AACCN8042Q" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Purchaser GSTIN</label>
                    <input className="input" value={profClientGst} onChange={(e) => setProfClientGst(e.target.value)} placeholder="29AACCN8042Q1ZS" />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Purchaser Address</label>
                  <textarea className="input" style={{ minHeight: 50 }} value={profClientAddr} onChange={(e) => setProfClientAddr(e.target.value)} placeholder="Clinic address, locality, city, state, pincode" />
                </div>
                <div className="grid-2" style={{ gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Service Category</label>
                    <input className="input" value={profServiceCat} onChange={(e) => setProfServiceCat(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>SAC Code</label>
                    <input className="input" value={profSacCode} onChange={(e) => setProfSacCode(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Discount & Tax Grid */}
            <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Discount (%)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => handleDiscountPercentChange(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>Discount Amt / Mo (₹)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => handleDiscountAmountChange(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>GST Rate (%)</label>
                <input
                  type="number"
                  className="input"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 3 }}>TDS Rate (%)</label>
                <input
                  type="number"
                  className="input"
                  value={tdsPercent}
                  onChange={(e) => setTdsPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
              <input
                type="checkbox"
                checked={includeTds}
                onChange={(e) => setIncludeTds(e.target.checked)}
                style={{ accentColor: '#4F46E5', width: 16, height: 16 }}
              />
              <span>Show TDS deduction on PDF / Document</span>
            </label>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* RIGHT PANEL: LIVE DOCUMENT PREVIEW & ACTIONS */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            background: '#F1F5F9',
            overflowY: 'auto',
            padding: '30px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, width: '100%', maxWidth: 800, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" style={{ background: '#10B981', color: '#FFFFFF', fontWeight: 700 }} onClick={shareWhatsApp}>
              💬 WhatsApp
            </button>
            <button type="button" className="btn btn-sm" style={{ background: '#6366F1', color: '#FFFFFF', fontWeight: 700 }} onClick={shareEmail}>
              📧 Email Client
            </button>
            <button type="button" className="btn btn-sm" style={{ background: '#28328C', color: '#FFFFFF', fontWeight: 700 }} onClick={exportPdf}>
              📄 Export PDF
            </button>
          </div>

          {/* Invoice Wrapper Content */}
          <div
            ref={invoiceRef}
            id="invoiceContent"
            style={{
              width: '100%',
              maxWidth: 800,
              background: '#FFFFFF',
              padding: '40px 50px',
              borderRadius: 16,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              border: '1px solid #E2E8F0',
              marginBottom: 40,
            }}
          >
            {/* Header with Official Practo Logo Attached */}
            <div
              className="invoice-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: '2px solid #28328C',
              }}
            >
              <div>
                <PractoLogo size="md" showTagline={false} />
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 700, marginTop: 8 }}>
                  Practo Technologies Private Limited
                </div>
              </div>
              <div style={{ textAlignment: 'right', textAlign: 'right' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#28328C', letterSpacing: '-0.5px', margin: 0 }}>
                  {docType}
                </h2>
                <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: 13, fontWeight: 600 }}>
                  Issued: {invoiceDate}
                </p>
              </div>
            </div>

            {!hasSelectedProducts ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Live Document Preview</h3>
                <p style={{ fontSize: 13, marginTop: 6, color: '#64748B' }}>
                  Select products and configure details on the left to see the proposal generate in real-time.
                </p>
              </div>
            ) : (
              <>
                {/* Proforma Metadata Box */}
                {isProforma && (
                  <div
                    className="proforma-meta-box"
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: 16,
                      marginBottom: 24,
                      fontSize: 12,
                    }}
                  >
                    <div className="grid-2" style={{ gap: 16 }}>
                      <div>
                        <h5 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', marginBottom: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
                          Seller Information
                        </h5>
                        <div className="flex justify-between py-1"><span>Company:</span><strong>{appSettings.sellerName}</strong></div>
                        <div className="flex justify-between py-1"><span>TAN:</span><strong>{appSettings.sellerTan}</strong></div>
                        <div className="flex justify-between py-1"><span>CIN:</span><strong>{appSettings.sellerCin}</strong></div>
                        <div className="flex justify-between py-1"><span>PAN:</span><strong>{appSettings.sellerPan}</strong></div>
                        <div className="flex justify-between py-1"><span>GSTIN:</span><strong>{appSettings.sellerGst}</strong></div>
                        <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: 4, lineHeight: 1.4 }}>
                          <strong>Address:</strong> {appSettings.sellerAddr}
                        </div>
                      </div>

                      <div>
                        <h5 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', marginBottom: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
                          Purchaser Information
                        </h5>
                        <div className="flex justify-between py-1"><span>Invoice To:</span><strong>{profClientName || 'Clinic Partner'}</strong></div>
                        <div className="flex justify-between py-1"><span>PAN:</span><strong>{profClientPan || 'N/A'}</strong></div>
                        <div className="flex justify-between py-1"><span>GSTIN:</span><strong>{profClientGst || 'N/A'}</strong></div>
                        <div className="flex justify-between py-1"><span>Service Cat:</span><strong>{profServiceCat}</strong></div>
                        <div className="flex justify-between py-1"><span>Invoice No:</span><strong>{profInvNo}</strong></div>
                        <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: 4, lineHeight: 1.4 }}>
                          <strong>Address:</strong> {profClientAddr || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Included Scope of Services Box */}
                <div
                  className="product-overview"
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 20,
                    borderRadius: 8,
                    marginBottom: 28,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <h4 style={{ margin: '0 0 10px 0', color: '#28328C', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Included Scope of Services
                  </h4>
                  {hasPrime && (
                    <div style={{ marginBottom: 10, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                      <strong style={{ color: '#0F172A' }}>Practo Prime:</strong> {appSettings.scopePrime}
                    </div>
                  )}
                  {hasReach && (
                    <div style={{ marginBottom: 10, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                      <strong style={{ color: '#0F172A' }}>Practo Reach Spotlight:</strong> {appSettings.scopeReach}
                    </div>
                  )}
                  {hasVideo && (
                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
                      <strong style={{ color: '#0F172A' }}>Professional Clinic Profile Shoot:</strong> {appSettings.scopeVideo}
                    </div>
                  )}
                </div>

                {/* Commercial Table Summary */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: 10,
                    marginBottom: 20,
                  }}
                >
                  <thead>
                    <tr style={{ background: '#28328C', color: '#FFFFFF' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60%' }}>
                        Item Description
                      </th>
                      {isProforma && (
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', width: '15%' }}>
                          SAC Code
                        </th>
                      )}
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>
                        Taxable Value (INR)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Prime Row */}
                    {hasPrime && (
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#0F172A', fontSize: 13 }}>Practo Prime</strong>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                            {primeVariant === 'supreme'
                              ? `Practo Prime Supreme | Call: ₹${primeCallCharge}/conn, Book: ₹${primeBookCharge}/conn`
                              : `Practo Prime AI | PFC: ₹${primePfcCharge}/conn`}
                          </div>
                        </td>
                        {isProforma && <td style={{ padding: '12px 16px', fontSize: 12 }}>{profSacCode}</td>}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                          {formatCurrency(primeTotal)}
                        </td>
                      </tr>
                    )}

                    {/* Reach Rows */}
                    {hasReach &&
                      reachSummaryItems.map((b, idx) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ color: '#0F172A', fontSize: 13 }}>
                              Practo Reach Spotlight {reachSummaryItems.length > 1 ? `(Campaign ${idx + 1})` : ''}
                            </strong>
                            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>
                              {b.city} | {b.zone} | {b.speciality} | Position {b.position} Spotlight<br />
                              Duration: {b.dur} Months @ ₹{formatCurrency(b.price)}/mo per slot<br />
                              <span style={{ color: '#0D9488', fontWeight: 700 }}>Share of Slot: {b.sovText}</span>
                            </div>
                          </td>
                          {isProforma && <td style={{ padding: '12px 16px', fontSize: 12 }}>{profSacCode}</td>}
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A', verticalAlign: 'bottom' }}>
                            {formatCurrency(b.blockTotal)}
                          </td>
                        </tr>
                      ))}

                    {/* Video Shoot Row */}
                    {hasVideo && (
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#0F172A', fontSize: 13 }}>Professional Clinic Profile Video Shoot</strong>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                            Exclusive On-Site Production
                          </div>
                        </td>
                        {isProforma && <td style={{ padding: '12px 16px', fontSize: 12 }}>{profSacCode}</td>}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0D9488' }}>
                          Complimentary
                        </td>
                      </tr>
                    )}

                    {/* Gross Value / Subtotal */}
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={isProforma ? 2 : 1} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13 }}>
                        {isProforma ? 'Total Amount Excluding GST -' : 'Gross Value'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#0F172A' }}>
                        {formatCurrency(baseAmt)}
                      </td>
                    </tr>

                    {/* Applied Discount */}
                    {!isProforma && (
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12.5, color: '#64748B' }}>
                          Applied Discount ({discountPercent}% on Reach Products)
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#DC2626', fontWeight: 700, fontSize: 12.5 }}>
                          - {formatCurrency(discAmt)}
                        </td>
                      </tr>
                    )}

                    {/* GST */}
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td colSpan={isProforma ? 2 : 1} style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12.5, color: '#64748B' }}>
                        GST ({taxPercent}%)
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>
                        {formatCurrency(taxAmt)}
                      </td>
                    </tr>

                    {/* Total Invoice Value */}
                    <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                      <td colSpan={isProforma ? 2 : 1} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13 }}>
                        TOTAL INVOICE VALUE (Incl. GST)
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#0F172A' }}>
                        ₹ {formatCurrency(invTotal)}
                      </td>
                    </tr>

                    {/* TDS Deduction */}
                    {includeTds && (
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td colSpan={isProforma ? 2 : 1} style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11.5, color: '#64748B' }}>
                          TDS - {tdsPercent}%
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11.5, color: '#64748B' }}>
                          {formatCurrency(tdsAmt)}
                        </td>
                      </tr>
                    )}

                    {/* Final Net Payable */}
                    <tr style={{ background: '#EEF2FF', color: '#28328C', fontWeight: 800, fontSize: 16 }}>
                      <td colSpan={isProforma ? 2 : 1} style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isProforma ? 'Payable Amount' : 'NET PAYABLE TO PRACTO'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        ₹ {formatCurrency(netPayable)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bank Details Box for Proforma */}
                {isProforma && (
                  <div
                    className="bank-details-box"
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: 16,
                      marginTop: 20,
                      fontSize: 12,
                    }}
                  >
                    <h4 style={{ fontSize: 12, fontWeight: 800, color: '#28328C', marginBottom: 8, textTransform: 'uppercase' }}>
                      Practo Bank Details
                    </h4>
                    <div className="grid-2" style={{ gap: 8 }}>
                      <div className="flex justify-between"><span>Beneficiary Name:</span><strong>{appSettings.beneName}</strong></div>
                      <div className="flex justify-between"><span>Bank:</span><strong>{appSettings.bankName}</strong></div>
                      <div className="flex justify-between"><span>Acc No:</span><strong>{appSettings.accNo}</strong></div>
                      <div className="flex justify-between"><span>IFSC:</span><strong>{appSettings.ifsc}</strong></div>
                      <div className="flex justify-between"><span>Acc Type:</span><strong>{appSettings.accType}</strong></div>
                      <div className="flex justify-between"><span>Payment Link:</span><strong style={{ color: '#1456FD' }}>{appSettings.payLink}</strong></div>
                    </div>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div
                  className="tnc-section"
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase' }}>
                    Terms & Conditions
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#64748B', fontSize: 11.5, lineHeight: 1.6 }}>
                    {appSettings.tnc.split('\n').filter(Boolean).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>

                {/* Footer Note */}
                <div
                  className="footer-note"
                  style={{
                    marginTop: 20,
                    color: '#64748B',
                    fontSize: 11.5,
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>Thank you for choosing Practo Healthcare Solutions.</div>
                  <div style={{ fontWeight: 700, color: '#28328C' }}>
                    Prepared by: {[appSettings.name, appSettings.phone, appSettings.email].filter(Boolean).join(' | ')}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* SYSTEM SETTINGS MODAL */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: 720,
              borderRadius: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>⚙️ Commercial Suite Settings</h3>
              <button type="button" onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em', marginBottom: 12 }}>
                Seller Information (Shows on Proforma)
              </div>
              <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                <div><label className="text-xs font-bold text-secondary mb-1">Company Name</label><input className="input" value={appSettings.sellerName} onChange={(e) => setAppSettings({ ...appSettings, sellerName: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Seller TAN</label><input className="input" value={appSettings.sellerTan} onChange={(e) => setAppSettings({ ...appSettings, sellerTan: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Seller CIN</label><input className="input" value={appSettings.sellerCin} onChange={(e) => setAppSettings({ ...appSettings, sellerCin: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Seller PAN</label><input className="input" value={appSettings.sellerPan} onChange={(e) => setAppSettings({ ...appSettings, sellerPan: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Seller GSTIN</label><input className="input" value={appSettings.sellerGst} onChange={(e) => setAppSettings({ ...appSettings, sellerGst: e.target.value })} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1">Seller Registered Address</label>
                <textarea className="input" value={appSettings.sellerAddr} onChange={(e) => setAppSettings({ ...appSettings, sellerAddr: e.target.value })} style={{ minHeight: 50 }} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em', marginBottom: 12 }}>
                Bank Details (Shows on Proforma)
              </div>
              <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
                <div><label className="text-xs font-bold text-secondary mb-1">Beneficiary Name</label><input className="input" value={appSettings.beneName} onChange={(e) => setAppSettings({ ...appSettings, beneName: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Bank Name & Branch</label><input className="input" value={appSettings.bankName} onChange={(e) => setAppSettings({ ...appSettings, bankName: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Account Number</label><input className="input" value={appSettings.accNo} onChange={(e) => setAppSettings({ ...appSettings, accNo: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">IFSC Code</label><input className="input" value={appSettings.ifsc} onChange={(e) => setAppSettings({ ...appSettings, ifsc: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Account Type</label><input className="input" value={appSettings.accType} onChange={(e) => setAppSettings({ ...appSettings, accType: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Payment Link</label><input className="input" value={appSettings.payLink} onChange={(e) => setAppSettings({ ...appSettings, payLink: e.target.value })} /></div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em', marginBottom: 12 }}>
                Personal Details (Shows on Proposal Footer)
              </div>
              <div className="grid-3" style={{ gap: 10, marginBottom: 16 }}>
                <div><label className="text-xs font-bold text-secondary mb-1">Sender Name</label><input className="input" value={appSettings.name} onChange={(e) => setAppSettings({ ...appSettings, name: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Phone</label><input className="input" value={appSettings.phone} onChange={(e) => setAppSettings({ ...appSettings, phone: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-secondary mb-1">Email</label><input className="input" value={appSettings.email} onChange={(e) => setAppSettings({ ...appSettings, email: e.target.value })} /></div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em', marginBottom: 12 }}>
                Scope of Services Custom Templates
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="text-xs font-bold text-secondary mb-1">Practo Prime Scope</label>
                <textarea className="input" value={appSettings.scopePrime} onChange={(e) => setAppSettings({ ...appSettings, scopePrime: e.target.value })} style={{ minHeight: 60 }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="text-xs font-bold text-secondary mb-1">Practo Reach Scope</label>
                <textarea className="input" value={appSettings.scopeReach} onChange={(e) => setAppSettings({ ...appSettings, scopeReach: e.target.value })} style={{ minHeight: 60 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1">Video Shoot Scope</label>
                <textarea className="input" value={appSettings.scopeVideo} onChange={(e) => setAppSettings({ ...appSettings, scopeVideo: e.target.value })} style={{ minHeight: 50 }} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#28328C', letterSpacing: '0.05em', marginBottom: 12 }}>
                Terms & Conditions
              </div>
              <textarea className="input" value={appSettings.tnc} onChange={(e) => setAppSettings({ ...appSettings, tnc: e.target.value })} style={{ minHeight: 90 }} />
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(false)}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
