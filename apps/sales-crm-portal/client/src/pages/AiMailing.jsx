import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';

export default function AiMailing() {
  const { addToast } = useCrm();
  const [selectedEmailId, setSelectedEmailId] = useState('mail-1');
  const [targetDoctor, setTargetDoctor] = useState('Dr. Aarav Mehta');
  const [targetClinic, setTargetClinic] = useState('Mehta Cardiology Clinic');
  const [targetSpecialty, setTargetSpecialty] = useState('Cardiology');
  const [targetCity, setTargetCity] = useState('Mumbai (Powai)');
  const [pitchTone, setPitchTone] = useState('ROI-Driven & Analytical');
  const [targetProduct, setTargetProduct] = useState('Practo Prime');
  const [generating, setGenerating] = useState(false);

  // Email Campaigns & Outbox Logs
  const [emailLogs, setEmailLogs] = useState([
    {
      id: 'mail-1',
      recipient: 'dr.mehta@mehtaclinic.in',
      doctor: 'Dr. Aarav Mehta',
      clinic: 'Mehta Cardiology Clinic',
      city: 'Mumbai',
      subject: 'Executive Brief: Eliminating 82% of patient no-shows at Mehta Cardiology (Powai)',
      product: 'Practo Prime',
      status: 'Opened (3x) • Clicked Link',
      statusType: 'opened',
      sentAt: '2026-08-26 07:30 AM',
      openTime: '08:12 AM',
      clicks: 2,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
          <div style="background: #0B132B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #06B6D4; margin: 0; font-size: 20px;">PRACTO PRIME ENTERPRISE</h2>
            <p style="color: #94A3B8; margin: 4px 0 0; font-size: 12px;">Doctor Practice Automation & Patient Retention Suite</p>
          </div>
          <div style="padding: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>Dr. Aarav Mehta</strong>,</p>
            <p>We recently completed our Q3 Patient Search Density Audit for Powai, Mumbai. We noticed <strong>Mehta Cardiology Clinic</strong> is seeing over <strong>1,200 monthly search impressions</strong>, yet typical specialty clinics experience a 18% to 24% dropped appointment rate due to manual confirmation delays.</p>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #166534; margin: 0 0 8px; font-size: 14px;">PROJECTED ANNUAL VALUE FOR MEHTA CARDIOLOGY</h4>
              <ul style="margin: 0; padding-left: 20px; color: #15803D; font-size: 13px; line-height: 1.6;">
                <li><strong>₹14.2L / yr</strong> Recovered patient consult revenue</li>
                <li><strong>82% reduction</strong> in last-minute slot no-shows</li>
                <li><strong>24/7 Zero-touch</strong> WhatsApp appointment scheduling</li>
              </ul>
            </div>
            <p>Leading practices like Apex Heart Institute and Dr. Gowda's Clinic onboarded Practo Prime and increased booked patient flow by 34% in 45 days.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="#" style="background: #06B6D4; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Schedule 7-Minute Screen Walkthrough →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748B;">Warm regards,<br><strong>Priya Sharma</strong><br>Senior Sales Director, Practo Enterprise</p>
          </div>
        </div>
      `,
    },
    {
      id: 'mail-2',
      recipient: 'contact@apexorthoblr.com',
      doctor: 'Dr. Shalini Varma',
      clinic: 'Apex Orthopedic Institute',
      city: 'Bangalore',
      subject: 'Exclusive Whitefield Territory Allocation: Practo Reach for Joint Replacement',
      product: 'Practo Reach',
      status: 'Delivered • Proposal Downloaded',
      statusType: 'clicked',
      sentAt: '2026-08-25 04:15 PM',
      openTime: '04:45 PM',
      clicks: 4,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
          <div style="background: #0B132B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #6366F1; margin: 0; font-size: 20px;">PRACTO REACH SPONSORED SLOTS</h2>
            <p style="color: #94A3B8; margin: 4px 0 0; font-size: 12px;">Guaranteed Patient Flow for Super-Specialists</p>
          </div>
          <div style="padding: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>Dr. Shalini Varma</strong>,</p>
            <p>With high search volume for knee replacement and arthroscopy in Whitefield, Bangalore, we are allocating exclusive sponsored visibility slots on Practo.com.</p>
            <p>Your practice is pre-qualified for the <strong>Practo Reach Platinum Tier</strong> with guaranteed monthly verified inquiries.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="#" style="background: #6366F1; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Review Territory SLA & Commercials →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748B;">Best regards,<br><strong>Rahul Kapoor</strong><br>Account Executive, Practo</p>
          </div>
        </div>
      `,
    },
    {
      id: 'mail-3',
      recipient: 'dr.gowda@gowdaheart.in',
      doctor: 'Dr. Rajeev Gowda',
      clinic: 'Gowda Heart & Vascular Centre',
      city: 'Bangalore',
      subject: 'Practo Prime Onboarding: Contract Ready for Digital Signature',
      product: 'Practo Prime',
      status: 'Replied (Positive)',
      statusType: 'replied',
      sentAt: '2026-08-25 11:00 AM',
      openTime: '11:04 AM',
      clicks: 3,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
          <div style="background: #0B132B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #10B981; margin: 0; font-size: 20px;">PRACTO PRIME AGREEMENT</h2>
          </div>
          <div style="padding: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>Dr. Rajeev Gowda</strong>,</p>
            <p>Following our conversation, your 3-year Practo Prime agreement for the BTM Layout facility is ready for digital execution.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="#" style="background: #10B981; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Access Secure Signing Room ✍️
              </a>
            </div>
          </div>
        </div>
      `,
    },
  ]);

  const activeEmail = emailLogs.find((e) => e.id === selectedEmailId) || emailLogs[0];

  const handleGenerateAiEmail = () => {
    setGenerating(true);
    addToast('Groq AI (LLaMA-3.3-70B) crafting personalized clinical pitch...', 'info');

    setTimeout(() => {
      const generated = {
        id: `mail-${Date.now()}`,
        recipient: `${targetDoctor.toLowerCase().replace(/[^a-z]/g, '')}@clinic.in`,
        doctor: targetDoctor,
        clinic: targetClinic,
        city: targetCity,
        subject: `Strategic Growth Brief: Patient acquisition analysis for ${targetClinic}`,
        product: targetProduct,
        status: 'Queued for Dispatch',
        statusType: 'queued',
        sentAt: 'Just now',
        openTime: 'Pending',
        clicks: 0,
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
            <div style="background: #0B132B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="color: #06B6D4; margin: 0; font-size: 20px;">PRACTO ENTERPRISE</h2>
              <p style="color: #94A3B8; margin: 4px 0 0; font-size: 12px;">Tailored Clinical Value Brief for ${targetSpecialty}</p>
            </div>
            <div style="padding: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear <strong>${targetDoctor}</strong>,</p>
              <p>Our healthcare analytics engine evaluated the ${targetSpecialty} market in <strong>${targetCity}</strong> and identified significant untapped patient volume for <strong>${targetClinic}</strong>.</p>
              <p>With ${targetProduct}, your clinic can automate appointment scheduling, eliminate phone line bottlenecks, and guarantee top search rankings.</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="#" style="background: #06B6D4; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                  View Full Practice Diagnostic →
                </a>
              </div>
            </div>
          </div>
        `,
      };

      setEmailLogs([generated, ...emailLogs]);
      setSelectedEmailId(generated.id);
      setGenerating(false);
      addToast('Cold pitch generated and queued successfully!', 'success');
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">SendGrid & Resend Enterprise API</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Groq LLaMA 3.3 Pitch Generator</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            AI Mailing & Cold Pitch Engine
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => addToast('DKIM, SPF & DMARC DNS health: 100% Validated', 'success')} className="btn btn-secondary btn-sm">
            🛡️ Deliverability Check
          </button>
          <button onClick={handleGenerateAiEmail} disabled={generating} className="btn btn-primary btn-sm">
            {generating ? 'Generating...' : '✨ Generate AI Email Pitch'}
          </button>
        </div>
      </div>

      {/* ── Key Metrics ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Deliverability Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>99.2%</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>0.01% Spam bounce rate</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Unique Open Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#06B6D4', marginTop: '4px' }}>58.7%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Benchmark: 24.1%</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Click-Through (CTR)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#818CF8', marginTop: '4px' }}>29.4%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Document & Demo Clicks</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Deals Generated</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>₹68.5L</div>
          <div style={{ fontSize: '12px', color: '#34D399', marginTop: '4px', fontWeight: 600 }}>Closed via automated mail</div>
        </div>
      </div>

      {/* ── AI Pitch Customizer Console ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1', boxShadow: '0 0 8px #6366F1' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Groq LLaMA 3.3 Clinical Cold Email Builder
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label className="input-label">Target Doctor</label>
            <input type="text" className="input-field" value={targetDoctor} onChange={(e) => setTargetDoctor(e.target.value)} />
          </div>

          <div>
            <label className="input-label">Clinic / Hospital</label>
            <input type="text" className="input-field" value={targetClinic} onChange={(e) => setTargetClinic(e.target.value)} />
          </div>

          <div>
            <label className="input-label">Specialty</label>
            <input type="text" className="input-field" value={targetSpecialty} onChange={(e) => setTargetSpecialty(e.target.value)} />
          </div>

          <div>
            <label className="input-label">Target Product</label>
            <select className="select-field" value={targetProduct} onChange={(e) => setTargetProduct(e.target.value)}>
              <option value="Practo Prime">Practo Prime (Patient Retention)</option>
              <option value="Practo Reach">Practo Reach (Sponsored Ranking)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Pitch Tone</label>
            <select className="select-field" value={pitchTone} onChange={(e) => setPitchTone(e.target.value)}>
              <option value="ROI-Driven & Analytical">ROI-Driven & Analytical</option>
              <option value="Consultative & Peer Proof">Consultative & Peer Proof</option>
              <option value="Executive & Direct">Executive & Direct</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Email Outbox & Live HTML Email Preview ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Email Outbox Ledger */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Dispatched Clinical Campaigns
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
            {emailLogs.map((mail) => {
              const isSelected = mail.id === activeEmail.id;
              return (
                <div
                  key={mail.id}
                  onClick={() => setSelectedEmailId(mail.id)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                    border: isSelected ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{mail.doctor}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mail.sentAt}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '2px' }}>{mail.recipient}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
                    {mail.subject}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span className="badge badge-indigo">{mail.product}</span>
                    <span className="badge badge-emerald">{mail.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: WYSIWYG HTML Email Preview */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live HTML Email Preview
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsive Email Template with Practo Branding</div>
            </div>
            <button
              onClick={() => {
                addToast(`Test email dispatched to ${activeEmail.recipient}`, 'success');
              }}
              className="btn btn-emerald btn-sm"
            >
              ✉️ Send Test Copy
            </button>
          </div>

          <div
            style={{
              flex: 1,
              background: '#F8FAFC',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              overflowY: 'auto',
              maxHeight: '480px',
              border: '1px solid var(--border-subtle)',
            }}
            dangerouslySetInnerHTML={{ __html: activeEmail.bodyHtml }}
          />
        </div>
      </div>
    </div>
  );
}
