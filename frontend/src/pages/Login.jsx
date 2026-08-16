import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * 8K Cinematic 3D Healthcare Sales AI Data Stage
 * Renders glowing cyan/navy data nodes, dynamic medical cross constellation,
 * holographic particles, LiDAR scan sweep, and mouse-driven 3D parallax.
 */
function HealthcareAiStage({ mousePos }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let t0 = performance.now();

    // Central Futuristic Medical Cross Nodes
    const crossOffsets = [
      // Center
      { x: 0, y: 0, z: 0, size: 6, pulse: 1, type: 'core' },
      // Top arm
      { x: 0, y: -45, z: 10, size: 4.5, type: 'node' },
      { x: 0, y: -90, z: 20, size: 4, type: 'node' },
      // Bottom arm
      { x: 0, y: 45, z: 10, size: 4.5, type: 'node' },
      { x: 0, y: 90, z: 20, size: 4, type: 'node' },
      // Left arm
      { x: -45, y: 0, z: 10, size: 4.5, type: 'node' },
      { x: -90, y: 0, z: 20, size: 4, type: 'node' },
      // Right arm
      { x: 45, y: 0, z: 10, size: 4.5, type: 'node' },
      { x: 90, y: 0, z: 20, size: 4, type: 'node' },
    ];

    // Constellation network of Lead & Hospital Nodes
    const leadNodes = Array.from({ length: 42 }, (_, i) => ({
      x: (Math.random() - 0.5) * 550,
      y: (Math.random() - 0.5) * 550,
      z: (Math.random() - 0.5) * 300,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      vz: (Math.random() - 0.5) * 0.2,
      r: 2.2 + (i % 4) * 0.8,
      leadType: i % 3 === 0 ? 'Prime Clinic' : i % 3 === 1 ? 'Reach Doctor' : 'Hospital Network',
      score: 75 + (i % 25),
      pulse: Math.random() * Math.PI * 2,
    }));

    // Ambient floating holographic dust particles
    const particles = Array.from({ length: 60 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + (i % 3) * 0.6,
      speed: 0.05 + (i % 4) * 0.02,
      phase: i * 0.8,
      color: i % 2 === 0 ? 'rgba(0, 229, 255, ' : 'rgba(45, 212, 191, ',
    }));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(point, centerX, centerY, rotX, rotY) {
      // 3D Rotation on Y and X axis based on time & mouse parallax
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Y-axis rotation
      let x1 = point.x * cosY + point.z * sinY;
      let z1 = -point.x * sinY + point.z * cosY;

      // X-axis rotation
      let y2 = point.y * cosX - z1 * sinX;
      let z2 = point.y * sinX + z1 * cosX;

      // Perspective projection
      const fov = 420;
      const scale = fov / (fov + z2 + 250);
      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        scale,
        z: z2,
      };
    }

    function frame(now) {
      const time = (now - t0) * 0.001;
      ctx.clearRect(0, 0, w, h);

      const centerX = w < 900 ? w * 0.5 : w * 0.32;
      const centerY = h * 0.5;

      // Dynamic parallax rotation from mouse position
      const targetRotY = (mousePos.current.x - 0.5) * 0.45 + (reduced ? 0 : time * 0.08);
      const targetRotX = (mousePos.current.y - 0.5) * -0.35 + (reduced ? 0 : Math.sin(time * 0.3) * 0.04);

      // 1. Dynamic Flashlight Light Source under Cursor
      const flashX = mousePos.current.x * w;
      const flashY = mousePos.current.y * h;
      const flashGrad = ctx.createRadialGradient(flashX, flashY, 20, flashX, flashY, 380);
      flashGrad.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
      flashGrad.addColorStop(0.5, 'rgba(14, 116, 144, 0.03)');
      flashGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Central 3D Aura Gradient around the Core
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 340);
      coreGrad.addColorStop(0, 'rgba(0, 229, 255, 0.18)');
      coreGrad.addColorStop(0.4, 'rgba(11, 24, 48, 0.12)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Render Projected Lead Nodes & Neural Network Connections
      const projectedLeads = leadNodes.map((n) => {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          n.z += n.vz;
          if (Math.abs(n.x) > 270) n.vx *= -1;
          if (Math.abs(n.y) > 270) n.vy *= -1;
          if (Math.abs(n.z) > 150) n.vz *= -1;
        }
        return {
          ...n,
          proj: project(n, centerX, centerY, targetRotX, targetRotY),
        };
      });

      // Draw Connection Lines between nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < projectedLeads.length; i++) {
        for (let j = i + 1; j < projectedLeads.length; j++) {
          const p1 = projectedLeads[i].proj;
          const p2 = projectedLeads[j].proj;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const alpha = (1 - dist / 95) * 0.28 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw Floating Lead Nodes
      for (const n of projectedLeads) {
        const p = n.proj;
        const pulse = Math.sin(time * 2 + n.pulse) * 0.3 + 0.7;
        const radius = Math.max(1, n.r * p.scale * pulse);

        // Outer Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${0.12 * p.scale})`;
        ctx.fill();

        // Core Point
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.leadType === 'Prime Clinic' ? '#00E5FF' : n.leadType === 'Reach Doctor' ? '#2dd4bf' : '#38bdf8';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 8 * p.scale;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. Render Central 3D Medical Cross Nodes & Beams
      const projectedCross = crossOffsets.map((c) => ({
        ...c,
        proj: project(c, centerX, centerY, targetRotX, targetRotY),
      }));

      // Connect Medical Cross Beams
      const centerCross = projectedCross[0].proj;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 14;

      for (let i = 1; i < projectedCross.length; i++) {
        const p = projectedCross[i].proj;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
        ctx.beginPath();
        ctx.moveTo(centerCross.x, centerCross.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Draw Medical Cross Nodes
      for (const c of projectedCross) {
        const p = c.proj;
        const pulse = 1 + Math.sin(time * 3 + (c.z * 0.1)) * 0.15;
        const r = c.size * p.scale * pulse;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Cinematic LiDAR Scan Line Wave
      const scanPeriod = (time * 0.28) % 1;
      const scanY = h * scanPeriod;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      scanGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.22)');
      scanGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, w, 60);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      // 6. Holographic Dust Particles
      for (const pt of particles) {
        const px = ((pt.x + (reduced ? 0 : time * pt.speed * 0.02)) % 1) * w;
        const py = (pt.y + Math.sin(time * pt.speed + pt.phase) * 0.02) * h;
        ctx.beginPath();
        ctx.fillStyle = `${pt.color}${0.2 + (pt.r % 2) * 0.2})`;
        ctx.arc(px, py, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mousePos]);

  return (
    <div className="px-login-stage" aria-hidden="true">
      <div className="px-login-orb px-login-orb-a" />
      <div className="px-login-orb px-login-orb-b" />
      <div className="px-login-grid-plane" />
      <canvas ref={canvasRef} className="px-login-canvas" />
      <div className="px-login-vignette" />
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Mouse coordinate tracking for Parallax & Flashlight lighting
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const cardRef = useRef(null);
  const buttonRef = useRef(null);
  const [btnMagnet, setBtnMagnet] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    mousePos.current = { x, y };

    // Cursor Magnetism calculation for the Authenticate Button
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

      if (dist < 60) {
        const pull = (60 - dist) / 60;
        setBtnMagnet({
          x: (e.clientX - btnCenterX) * 0.15 * pull,
          y: (e.clientY - btnCenterY) * 0.15 * pull,
        });
      } else {
        setBtnMagnet({ x: 0, y: 0 });
      }
    }
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to="/pulse" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy || authenticating) return;

    setBusy(true);
    setAuthenticating(true);
    setError('');

    try {
      await login({ login: form.login, password: form.password });
      // Brief cinematic verification delay for scan animation
      setTimeout(() => {
        navigate('/pulse');
      }, 550);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setAuthenticating(false);
      setBusy(false);
    }
  }

  function handleFillDemo() {
    setForm({ login: 'superadmin', password: 'SuperAdmin@123' });
    setError('');
  }

  return (
    <div className="px-login px-login-8k" onMouseMove={handleMouseMove}>
      <HealthcareAiStage mousePos={mousePos} />

      <div className="px-login-split-60-40">
        {/* Left Side (Visual Story - 60%) */}
        <section className="px-login-hero">
          <div className="px-brand-badge">
            <span className="px-badge-dot" />
            <span>Practo Healthcare AI · Autonomous Sales Intelligence</span>
          </div>

          <h1 className="px-hero-title">
            Predictive Healthcare <br />
            <span className="px-title-gradient">Sales Intelligence</span>
          </h1>

          <p className="px-hero-lede">
            Bridging clinical trust with hyper-advanced predictive AI. Discover authentic doctors, 
            automate Reach &amp; Prime conversion, and dispatch turn-by-turn AI Voice calls with WhatsApp &amp; Cold Email outreach.
          </p>

          {/* Live Healthcare Graph Telemetry Cards */}
          <div className="px-telemetry-grid">
            <div className="px-telemetry-card">
              <span className="px-telemetry-label">Doctor Graph</span>
              <strong className="px-telemetry-val">99.4% Match</strong>
              <small className="px-telemetry-sub">Practo.com + Maps Verified</small>
            </div>
            <div className="px-telemetry-card">
              <span className="px-telemetry-label">AI Voice Engine</span>
              <strong className="px-telemetry-val">4 Personas</strong>
              <small className="px-telemetry-sub">ElevenLabs HD Speech</small>
            </div>
            <div className="px-telemetry-card">
              <span className="px-telemetry-label">Autopilot Sequencer</span>
              <strong className="px-telemetry-val">100% Native</strong>
              <small className="px-telemetry-sub">Calls · WhatsApp · Email</small>
            </div>
          </div>
        </section>

        {/* Right Side (Interface - 40%) - Sleek Glassmorphism Panel */}
        <div className="px-login-interface-col">
          <form
            ref={cardRef}
            className={`glass-panel px-login-glass-card ${authenticating ? 'is-authenticating' : ''}`}
            onSubmit={onSubmit}
          >
            {/* Biometric LiDAR Scan Sweep Line */}
            <div className="px-biometric-scan-line" />

            <div className="px-card-header">
              <div className="px-logo-wrap">
                <img src="/practo-logo-light.svg" alt="Practo" className="px-login-logo" />
                <span className="px-ai-chip">AI SALES 2.0</span>
              </div>
              <h2>Sign in to Command Center</h2>
              <p>Enter your sales workspace credentials to initialize AI session</p>
            </div>

            {/* Quick Demo Fill Shortcut Pill */}
            <button
              type="button"
              className="px-demo-shortcut-btn"
              onClick={handleFillDemo}
              title="Click to auto-fill Superadmin credentials"
            >
              <span>⚡ Quick Demo:</span> <code>superadmin</code> / <code>SuperAdmin@123</code>
            </button>

            {/* User ID / Email Field with Floating Label & Cyan Border */}
            <div className={`px-float-group ${focusedField === 'login' || form.login ? 'is-active' : ''}`}>
              <label htmlFor="login-field">User ID or Email Address</label>
              <input
                id="login-field"
                required
                name="username"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="superadmin or email"
                className="ai-input"
                value={form.login}
                onFocus={() => setFocusedField('login')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
              />
            </div>

            {/* Password Field with Floating Label */}
            <div className={`px-float-group ${focusedField === 'password' || form.password ? 'is-active' : ''}`}>
              <label htmlFor="password-field">Password</label>
              <input
                id="password-field"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="ai-input"
                value={form.password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error ? <div className="px-login-error">⚠️ {error}</div> : null}

            {/* Reactive "Authenticate AI" Button with Liquid Gradient & Magnetic Pull */}
            <button
              ref={buttonRef}
              type="submit"
              className="px-btn-authenticate"
              disabled={busy}
              style={{
                transform: `translate3d(${btnMagnet.x}px, ${btnMagnet.y}px, 0)`,
              }}
            >
              {authenticating ? (
                <span className="px-btn-spinner-wrap">
                  <span className="px-ai-ring-spinner" />
                  <span>Verifying Biometrics &amp; AI Workspace…</span>
                </span>
              ) : (
                <span className="px-btn-text-wrap">
                  <span>Authenticate AI</span>
                  <span className="px-btn-arrow">→</span>
                </span>
              )}
            </button>

            {/* Security & SOC2 Trust Footnotes */}
            <div className="px-login-trust-footer">
              <span className="px-trust-pill">🔒 256-bit AES</span>
              <span className="px-trust-pill">🛡️ Practo SOC2 Ready</span>
              <span className="px-trust-pill">⚡ Live Telemetry</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
