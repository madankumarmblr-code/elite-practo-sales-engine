import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulsePitchStudio() {
  const toast = useToast();

  // Tab state: 'generator' | 'simulator' | 'history'
  const [activeTab, setActiveTab] = useState('generator');

  // Generator form state
  const [clinicName, setClinicName] = useState('Apollo Dental Clinic');
  const [doctorName, setDoctorName] = useState('Dr. Priya Menon');
  const [specialty, setSpecialty] = useState('Dental Surgery');
  const [city, setCity] = useState('Bangalore');
  const [locality, setLocality] = useState('Indiranagar');
  const [product, setProduct] = useState('PRIME');
  const [patientsPerDay, setPatientsPerDay] = useState(25);
  const [consultFee, setConsultFee] = useState(800);

  // Pitch generation results
  const [generating, setGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState(null);

  // Objection simulator state
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulatorResponse, setSimulatorResponse] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  async function loadPersonas() {
    try {
      const data = await api.getPitchPersonas();
      setPersonas(data.personas || []);
      if (data.personas?.length) {
        setSelectedPersonaId(data.personas[0].id);
        handleSimulateObjection(data.personas[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await api.getPitchHistory({ limit: 15 });
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleGeneratePitch(e) {
    if (e) e.preventDefault();
    if (!clinicName) {
      toast('Please enter clinic name');
      return;
    }
    setGenerating(true);
    try {
      const result = await api.generatePitch({
        clinicName,
        doctorName,
        specialty,
        city,
        locality,
        product,
        currentPatientsPerDay: patientsPerDay,
        avgConsultationFee: consultFee,
      });
      setGeneratedPitch(result);
      toast('🚀 AI Pitch & Battlecard generated!');
    } catch (err) {
      toast(err.message || 'Pitch generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSimulateObjection(pId) {
    const targetId = pId || selectedPersonaId;
    if (!targetId) return;
    setSimulating(true);
    try {
      const res = await api.simulateObjection({
        personaId: targetId,
        specialty,
        product,
      });
      setSimulatorResponse(res);
    } catch (err) {
      toast(err.message || 'Objection simulator failed');
    } finally {
      setSimulating(false);
    }
  }

  function copyText(text, label) {
    navigator.clipboard.writeText(text);
    toast(`Copied ${label} to clipboard!`);
  }

  return (
    <div className="pulse-page px-pitch-studio" style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <header className="pulse-head" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="px-eyebrow" style={{ color: '#0d9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
            Practo AI Sales Pilot
          </p>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
            Doctor Pitch Studio &amp; Objection Simulator
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Hyper-personalized clinical pitches, revenue ROI calculators, and live objection handling battlecards for Practo Prime, Reach, Ray, and Insta.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--panel-solid, #1e293b)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`pulse-btn ${activeTab === 'generator' ? 'teal' : 'ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: 8 }}
            onClick={() => setActiveTab('generator')}
          >
            ⚡ Pitch Generator
          </button>
          <button
            type="button"
            className={`pulse-btn ${activeTab === 'simulator' ? 'teal' : 'ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: 8 }}
            onClick={() => setActiveTab('simulator')}
          >
            🎯 Objection Arena
          </button>
          <button
            type="button"
            className={`pulse-btn ${activeTab === 'history' ? 'teal' : 'ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: 8 }}
            onClick={() => setActiveTab('history')}
          >
            📑 Pitch Log
          </button>
        </div>
      </header>

      {/* TAB 1: AI PITCH GENERATOR */}
      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Clinic & Doctor Configuration Form */}
          <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🏥</span> Target Clinic Profiler
            </h3>

            <form onSubmit={handleGeneratePitch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                  Clinic / Hospital Name *
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. Medanta Care Clinic"
                  className="ai-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. Full Name"
                    className="ai-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    Specialty
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 10 }}
                  >
                    <option value="Dental Surgery">Dental Surgery</option>
                    <option value="Dermatology & Cosmetology">Dermatology</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics & Joint">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Gynecology & IVF">Gynecology</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bangalore"
                    className="ai-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    Locality / Zone
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Indiranagar"
                    className="ai-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                  Practo Product Tier
                </label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 10 }}
                >
                  <option value="PRIME">Practo Prime (15-Min Wait Tech &amp; Booking Conversion)</option>
                  <option value="REACH">Practo Reach (Search Rank Boost &amp; Locality Dominance)</option>
                  <option value="RAY_PMS">Practo Ray PMS (Cloud EMR, WhatsApp Rx &amp; Billing)</option>
                  <option value="INSTA_HMS">Practo Insta HMS (Enterprise Hospital &amp; OT Suite)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    Avg Patients / Day
                  </label>
                  <input
                    type="number"
                    value={patientsPerDay}
                    onChange={(e) => setPatientsPerDay(e.target.value)}
                    className="ai-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
                    Consult Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={consultFee}
                    onChange={(e) => setConsultFee(e.target.value)}
                    className="ai-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="pulse-btn"
                disabled={generating}
                style={{ marginTop: 8, padding: '10px 18px', width: '100%', fontWeight: 700 }}
              >
                {generating ? 'Generating AI Deck...' : '✨ Generate AI Pitch Deck'}
              </button>
            </form>
          </section>

          {/* Generated Pitch Deck & Channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {generatedPitch ? (
              <>
                {/* ROI Highlight Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(14, 165, 233, 0.1) 100%)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    borderRadius: 16,
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#2dd4bf' }}>
                      Financial ROI Projection
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      +₹{generatedPitch.roi.additionalMonthlyRevenue?.toLocaleString()} / month
                    </h3>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>
                      Est. +{generatedPitch.roi.estimatedNewPatientsMonth} new patients monthly · <strong>{generatedPitch.roi.roiMultiplier}x Monthly ROI</strong>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Product Investment</div>
                    <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>
                      ₹{generatedPitch.roi.monthlyCost?.toLocaleString()} / mo
                    </strong>
                  </div>
                </div>

                {/* 30-Sec Pitch */}
                <section className="pulse-card px-glass" style={{ padding: 20, borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ fontSize: '0.92rem', color: '#2dd4bf' }}>🎙️ 30-Second Doctor Elevator Pitch</strong>
                    <button
                      type="button"
                      className="pulse-btn ghost"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => copyText(generatedPitch.pitches.elevatorPitch, 'Elevator Pitch')}
                    >
                      📋 Copy Pitch
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-main)' }}>
                    {generatedPitch.pitches.elevatorPitch}
                  </p>
                </section>

                {/* WhatsApp Hook */}
                <section className="pulse-card px-glass" style={{ padding: 20, borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ fontSize: '0.92rem', color: '#22c55e' }}>💬 WhatsApp Direct Hook</strong>
                    <button
                      type="button"
                      className="pulse-btn ghost"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => copyText(generatedPitch.pitches.whatsappHook, 'WhatsApp Script')}
                    >
                      📋 Copy WhatsApp Text
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                      background: 'rgba(0,0,0,0.1)',
                      padding: 14,
                      borderRadius: 10,
                      color: 'var(--text-main)',
                    }}
                  >
                    {generatedPitch.pitches.whatsappHook}
                  </pre>
                </section>

                {/* Outbound AI Call Script */}
                <section className="pulse-card px-glass" style={{ padding: 20, borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ fontSize: '0.92rem', color: '#38bdf8' }}>📞 Outbound Discovery &amp; Demo Call Script</strong>
                    <button
                      type="button"
                      className="pulse-btn ghost"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() =>
                        copyText(
                          `${generatedPitch.pitches.outboundCallScript.opener}\n\n${generatedPitch.pitches.outboundCallScript.hook}\n\n${generatedPitch.pitches.outboundCallScript.valuePitch}\n\n${generatedPitch.pitches.outboundCallScript.closeForDemo}`,
                          'Call Script'
                        )
                      }
                    >
                      📋 Copy Call Script
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>1. Opener:</strong> {generatedPitch.pitches.outboundCallScript.opener}
                    </div>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>2. Locality Hook:</strong> {generatedPitch.pitches.outboundCallScript.hook}
                    </div>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>3. Value Prop:</strong> {generatedPitch.pitches.outboundCallScript.valuePitch}
                    </div>
                    <div>
                      <strong style={{ color: '#2dd4bf' }}>4. Demo Close:</strong> {generatedPitch.pitches.outboundCallScript.closeForDemo}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <div
                className="pulse-card"
                style={{
                  padding: 48,
                  textAlign: 'center',
                  borderRadius: 16,
                  border: '2px dashed var(--border)',
                  background: 'transparent',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🩺</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>No Pitch Generated Yet</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.88rem', maxWidth: 420, marginInline: 'auto' }}>
                  Fill in clinic parameters on the left and click <strong>Generate AI Pitch Deck</strong> to compute tailored ROI calculations, WhatsApp drips, and call battlecards.
                </p>
                <button
                  type="button"
                  className="pulse-btn"
                  style={{ marginTop: 18 }}
                  onClick={() => handleGeneratePitch()}
                >
                  🚀 Generate Sample Apollo Dental Pitch
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE OBJECTION ARENA */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Persona Selector List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Doctor Objection Personas
            </h3>
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pulse-card"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: selectedPersonaId === p.id ? '2px solid #2dd4bf' : '1px solid var(--border)',
                  background: selectedPersonaId === p.id ? 'rgba(45, 212, 191, 0.08)' : 'var(--card-bg)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setSelectedPersonaId(p.id);
                  handleSimulateObjection(p.id);
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)' }}>{p.name}</strong>
                <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600, marginTop: 2 }}>{p.specialty}</div>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                  &ldquo;{p.objection.slice(0, 65)}...&rdquo;
                </p>
              </button>
            ))}
          </div>

          {/* Simulator Response & Battlecard */}
          {simulatorResponse ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Doctor Persona Callout */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 14,
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    DOCTOR OBJECTION
                  </span>
                  <strong style={{ fontSize: '0.92rem' }}>{simulatorResponse.persona.name} ({simulatorResponse.persona.archetype})</strong>
                </div>
                <blockquote style={{ margin: '6px 0 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', fontStyle: 'italic' }}>
                  &ldquo;{simulatorResponse.persona.objection}&rdquo;
                </blockquote>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  🧠 <strong>Underlying Fear:</strong> {simulatorResponse.persona.underlyingFear}
                </div>
              </div>

              {/* Winning Strategy Script */}
              <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#2dd4bf' }}>
                      Winning Rebuttal Script
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem' }}>Clinical Anchor Strategy</h3>
                  </div>
                  <button
                    type="button"
                    className="pulse-btn"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() =>
                      copyText(
                        `${simulatorResponse.rebuttal.acknowledgment} ${simulatorResponse.rebuttal.pivot} ${simulatorResponse.rebuttal.valueProp} ${simulatorResponse.rebuttal.proofPoint} ${simulatorResponse.rebuttal.callToAction}`,
                        'Full Rebuttal'
                      )
                    }
                  >
                    📋 Copy Full Script
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem', lineHeight: 1.55 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, borderLeft: '3px solid #38bdf8' }}>
                    <strong style={{ color: '#38bdf8' }}>1. Acknowledge &amp; Validate:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{simulatorResponse.rebuttal.acknowledgment}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, borderLeft: '3px solid #f59e0b' }}>
                    <strong style={{ color: '#f59e0b' }}>2. Psychological Pivot:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{simulatorResponse.rebuttal.pivot}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, borderLeft: '3px solid #2dd4bf' }}>
                    <strong style={{ color: '#2dd4bf' }}>3. Practo Solution (Prime/Reach):</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{simulatorResponse.rebuttal.valueProp}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, borderLeft: '3px solid #a855f7' }}>
                    <strong style={{ color: '#a855f7' }}>4. Peer Social Proof:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{simulatorResponse.rebuttal.proofPoint}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, borderLeft: '3px solid #22c55e' }}>
                    <strong style={{ color: '#22c55e' }}>5. Low-Friction Demo Close:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{simulatorResponse.rebuttal.callToAction}</p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="pulse-card" style={{ padding: 48, textAlign: 'center' }}>
              Select an objection persona on the left to inspect the rebuttal strategy.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PITCH LOG / HISTORY */}
      {activeTab === 'history' && (
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Generated Pitch History &amp; Audit Log</h3>
          {loadingHistory ? (
            <div style={{ padding: 24, textAlign: 'center' }}>Loading pitch history...</div>
          ) : history.length ? (
            <div className="pulse-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="pulse-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 10 }}>Clinic / Doctor</th>
                    <th style={{ padding: 10 }}>Specialty &amp; City</th>
                    <th style={{ padding: 10 }}>Product</th>
                    <th style={{ padding: 10 }}>Elevator Pitch Snippet</th>
                    <th style={{ padding: 10 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10 }}>
                        <strong>{h.clinic_name}</strong>
                        {h.doctor_name ? <div className="muted">{h.doctor_name}</div> : null}
                      </td>
                      <td style={{ padding: 10 }}>
                        {h.specialty || 'General'}
                        <div className="muted">{h.city}</div>
                      </td>
                      <td style={{ padding: 10 }}>
                        <span className="pulse-status-pill ok" style={{ fontSize: '0.72rem' }}>
                          {h.product}
                        </span>
                      </td>
                      <td style={{ padding: 10, maxWidth: 300, color: 'var(--muted)' }}>
                        {h.pitch_deck?.elevatorPitch?.slice(0, 100)}...
                      </td>
                      <td style={{ padding: 10, fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center' }} className="muted">
              No pitch history recorded yet. Use the Generator tab to produce your first pitch!
            </div>
          )}
        </section>
      )}
    </div>
  );
}
