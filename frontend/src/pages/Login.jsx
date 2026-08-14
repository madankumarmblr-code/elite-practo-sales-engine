import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RECENT_LEADS = [
  { clinic: 'Skin & Smile Clinic', place: 'Jayanagar · Dermatology', status: 'WhatsApp sent', tone: 'teal' },
  { clinic: 'Apollo Spectra', place: 'Koramangala · Ortho', status: 'Call queued', tone: 'amber' },
  { clinic: 'Care Dental Hub', place: 'Indiranagar · Dental', status: 'Proposal ready', tone: 'mint' },
  { clinic: 'Nova ENT Centre', place: 'Whitefield · ENT', status: 'Follow-up', tone: 'blue' },
];

function AmbientStage() {
  return (
    <div className="nx-stage" aria-hidden="true">
      <div className="nx-sky" />
      <div className="nx-glow nx-glow-a" />
      <div className="nx-glow nx-glow-b" />
      <div className="nx-glow nx-glow-c" />
      <svg className="nx-scape nx-scape-left" viewBox="0 0 420 640" fill="none" preserveAspectRatio="xMidYMax slice">
        <path
          d="M0 640V220c28-8 52-36 78-34 30 2 48 42 78 48 36 8 58-34 92-28 40 8 52 62 90 70 26 6 48-18 82-12v376H0Z"
          fill="url(#nxHillL)"
          opacity="0.55"
        />
        <path d="M48 640V310c22-40 48-62 78-58 36 6 44 58 82 64s58-40 94-28c22 8 36 36 62 42v310H48Z" fill="url(#nxHillL2)" opacity="0.4" />
        <g opacity="0.35" stroke="#0a7a6a" strokeWidth="1.2">
          <path d="M92 318c8-42 22-78 22-78s14 36 22 78" />
          <path d="M168 290c10-52 28-96 28-96s18 44 28 96" />
          <path d="M248 304c8-46 24-84 24-84s16 38 24 84" />
          <path d="M318 276c12-58 32-108 32-108s20 50 32 108" />
        </g>
        <defs>
          <linearGradient id="nxHillL" x1="0" y1="200" x2="0" y2="640" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9fd9c8" />
            <stop offset="1" stopColor="#d8f3ee" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="nxHillL2" x1="0" y1="260" x2="0" y2="640" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6bbfad" />
            <stop offset="1" stopColor="#e8f8f2" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
      <svg className="nx-scape nx-scape-right" viewBox="0 0 420 640" fill="none" preserveAspectRatio="xMidYMax slice">
        <path
          d="M420 640V200c-30-6-54 28-86 24-38-4-52-58-92-52-42 6-58 66-98 58-34-6-48-48-82-42v454h358Z"
          fill="url(#nxHillR)"
          opacity="0.5"
        />
        <path d="M380 640V300c-24-36-52-54-84-48-40 8-50 62-92 56s-62-52-100-40c-24 8-40 40-68 46v326h344Z" fill="url(#nxHillR2)" opacity="0.38" />
        <g opacity="0.32" stroke="#0a7a6a" strokeWidth="1.2">
          <path d="M110 292c8-40 20-74 20-74s12 34 20 74" />
          <path d="M196 268c10-50 26-92 26-92s16 42 26 92" />
          <path d="M280 286c9-44 24-80 24-80s15 36 24 80" />
          <path d="M348 250c12-56 30-104 30-104s18 48 30 104" />
        </g>
        <defs>
          <linearGradient id="nxHillR" x1="420" y1="180" x2="420" y2="640" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8ecfbe" />
            <stop offset="1" stopColor="#d8f3ee" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="nxHillR2" x1="420" y1="250" x2="420" y2="640" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5fb5a2" />
            <stop offset="1" stopColor="#e8f8f2" stopOpacity="0.08" />
          </linearGradient>
        </defs>
      </svg>
      <div className="nx-birds">
        <span />
        <span />
        <span />
      </div>
      <div className="nx-vignette" />
    </div>
  );
}

function SalesPreview() {
  return (
    <div className="nx-preview-wrap">
      <div className="nx-preview" role="img" aria-label="Salesmaster clinic outreach dashboard preview">
        <aside className="nx-side">
          <div className="nx-side-brand">
            <img src="/practo-logo.svg" alt="" />
            <span>Salesmaster</span>
          </div>
          <nav className="nx-side-nav">
            <span className="is-active">Discover</span>
            <span>Leads</span>
            <span>Outreach</span>
            <span>Calls</span>
            <span>Pipeline</span>
            <span>Reports</span>
          </nav>
        </aside>
        <div className="nx-main">
          <header className="nx-main-bar">
            <div className="nx-search">Bangalore · Dermatology</div>
            <div className="nx-avatar">SM</div>
          </header>
          <div className="nx-main-body">
            <div className="nx-greeting">
              <h3>Today&apos;s clinic pipeline</h3>
              <p>Live Practo discovery + WhatsApp, Gmail &amp; call outreach</p>
            </div>
            <div className="nx-actions">
              <button type="button" className="nx-chip is-primary" tabIndex={-1}>
                Discover clinics
              </button>
              <button type="button" className="nx-chip" tabIndex={-1}>
                WhatsApp blast
              </button>
              <button type="button" className="nx-chip" tabIndex={-1}>
                Queue calls
              </button>
              <button type="button" className="nx-chip" tabIndex={-1}>
                Send proposals
              </button>
            </div>
            <div className="nx-panels">
              <div className="nx-panel nx-panel-chart">
                <div className="nx-panel-label">Leads discovered</div>
                <div className="nx-panel-value">
                  1,284 <span>+18% this week</span>
                </div>
                <svg className="nx-chart" viewBox="0 0 320 90" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="nxChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(15,159,138,0.35)" />
                      <stop offset="100%" stopColor="rgba(15,159,138,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    className="nx-chart-fill"
                    d="M0 78 C40 72, 55 48, 80 52 C110 58, 130 28, 160 34 C190 40, 210 18, 240 24 C270 30, 290 12, 320 16 L320 90 L0 90 Z"
                    fill="url(#nxChartFill)"
                  />
                  <path
                    className="nx-chart-line"
                    d="M0 78 C40 72, 55 48, 80 52 C110 58, 130 28, 160 34 C190 40, 210 18, 240 24 C270 30, 290 12, 320 16"
                    fill="none"
                    stroke="#0f9f8a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="nx-panel nx-panel-stats">
                <div className="nx-panel-label">Outreach today</div>
                <ul className="nx-stat-list">
                  <li>
                    <span>WhatsApp</span>
                    <strong>342</strong>
                  </li>
                  <li>
                    <span>Gmail</span>
                    <strong>128</strong>
                  </li>
                  <li>
                    <span>Calls</span>
                    <strong>56</strong>
                  </li>
                  <li>
                    <span>Booked demos</span>
                    <strong>19</strong>
                  </li>
                </ul>
              </div>
            </div>
            <div className="nx-leads">
              <div className="nx-leads-head">
                <span>Recent clinic leads</span>
                <span className="nx-pulse">Live</span>
              </div>
              <ul className="nx-leads-list">
                {RECENT_LEADS.map((row) => (
                  <li key={row.clinic} className={`nx-lead tone-${row.tone}`}>
                    <div>
                      <strong>{row.clinic}</strong>
                      <em>{row.place}</em>
                    </div>
                    <span>{row.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login({ login: form.login, password: form.password });
      navigate(user?.role === 'superadmin' ? '/super-admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nx-page">
      <AmbientStage />

      <header className="nx-nav">
        <a className="nx-brand" href="#top" onClick={(e) => e.preventDefault()}>
          <img src="/practo-logo.svg" alt="" />
          <span>Salesmaster</span>
        </a>
        <nav className="nx-nav-links" aria-label="Product">
          <a href="#discover">Discover</a>
          <a href="#outreach">Outreach</a>
          <a href="#pipeline">Pipeline</a>
        </nav>
        <button type="button" className="nx-nav-cta" onClick={() => setShowForm(true)}>
          Sign in
        </button>
      </header>

      <main className="nx-hero" id="top">
        <div className="nx-copy">
          <div className="nx-badge">
            <span className="nx-badge-dot" />
            Practo clinic discovery · WhatsApp · Gmail · Calls
          </div>
          <p className="nx-brand-mark">Salesmaster</p>
          <h1 className="nx-title">
            The future of <em>clinic</em> sales automation.
          </h1>
          <p className="nx-lede">
            Discover authentic Practo leads, run multi-channel outreach, and close healthcare deals
            from one live workspace.
          </p>

          <div className="nx-cta" id="sign-in">
            {!showForm ? (
              <div className="nx-cta-row">
                <button type="button" className="nx-btn-primary" onClick={() => setShowForm(true)}>
                  Sign in to workspace
                </button>
                <a className="nx-btn-ghost" href="#discover">
                  See how it works
                </a>
              </div>
            ) : (
              <form className="nx-form" onSubmit={onSubmit}>
                <label className="nx-field">
                  <span>User ID / Email</span>
                  <input
                    required
                    name="username"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="User ID or email"
                    value={form.login}
                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                    autoFocus
                  />
                </label>
                <label className="nx-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </label>
                {error ? <div className="nx-error">{error}</div> : null}
                <button type="submit" className="nx-btn-primary nx-submit" disabled={busy}>
                  {busy ? 'Signing in…' : 'Enter workspace'}
                </button>
              </form>
            )}
          </div>
        </div>

        <SalesPreview />
      </main>

      <section className="nx-strip" id="discover" aria-label="Product highlights">
        <div>
          <h2>Discover</h2>
          <p>Pull authentic clinic leads from Practo by city, locality, and specialty.</p>
        </div>
        <div id="outreach">
          <h2>Outreach</h2>
          <p>Orchestrate WhatsApp, Gmail, and call sequences without leaving the desk.</p>
        </div>
        <div id="pipeline">
          <h2>Pipeline</h2>
          <p>Track proposals, demos, and closed healthcare deals in one motion.</p>
        </div>
      </section>
    </div>
  );
}
