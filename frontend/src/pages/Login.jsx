import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HealthcareStage() {
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

    const particles = Array.from({ length: 36 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + (i % 4) * 0.7,
      s: 0.08 + (i % 5) * 0.03,
      p: i * 0.7,
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

    function drawEcg(time) {
      const midY = h * 0.58;
      const amp = Math.min(42, h * 0.05);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(45, 212, 191, 0.45)';
      ctx.shadowBlur = 12;
      for (let x = 0; x <= w; x += 3) {
        const u = (x / w) * 8 + time * 1.4;
        const beat =
          Math.sin(u * Math.PI * 2) * 0.15 +
          Math.exp(-Math.pow(((u % 1) - 0.35) * 12, 2)) * 1.8 -
          Math.exp(-Math.pow(((u % 1) - 0.42) * 18, 2)) * 2.4 +
          Math.exp(-Math.pow(((u % 1) - 0.48) * 14, 2)) * 1.1;
        const y = midY - beat * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function frame(now) {
      const time = (now - t0) * 0.001;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(w * 0.7, h * 0.25, 40, w * 0.55, h * 0.4, w * 0.7);
      g.addColorStop(0, 'rgba(45, 212, 191, 0.18)');
      g.addColorStop(0.45, 'rgba(14, 116, 144, 0.1)');
      g.addColorStop(1, 'rgba(2, 12, 27, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      if (!reduced) drawEcg(time);

      for (const p of particles) {
        const x = ((p.x + (reduced ? 0 : time * p.s * 0.02)) % 1) * w;
        const y = (p.y + Math.sin(time * p.s + p.p) * 0.02) * h;
        ctx.beginPath();
        ctx.fillStyle = `rgba(94, 234, 212, ${0.25 + (p.r % 2) * 0.15})`;
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
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
  }, []);

  return (
    <div className="px-login-stage" aria-hidden="true">
      <div className="px-login-orb px-login-orb-a" />
      <div className="px-login-orb px-login-orb-b" />
      <div className="px-login-mesh" />
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

  if (!loading && isAuthenticated) {
    return <Navigate to="/pulse" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ login: form.login, password: form.password });
      navigate('/pulse');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-login">
      <HealthcareStage />
      <div className="px-login-shell">
        <section className="px-login-brand">
          <img src="/practo-logo-light.svg" alt="Practo" className="px-login-logo" />
          <p className="px-login-eyebrow">Healthcare sales automation</p>
          <h1 className="px-login-title">PractoPulse</h1>
          <p className="px-login-lede">
            Discover authentic clinics, classify Reach &amp; Prime fit, and push WhatsApp, Gmail,
            and AI calls through n8n Autopilot — built for Practo inside sales.
          </p>
          <ul className="px-login-points">
            <li>Lead Engine · Practo.com discovery</li>
            <li>AI Autopilot · messages &amp; call logs</li>
            <li>Commercial Suite · live inventory</li>
          </ul>
        </section>

        <form className="px-login-card" onSubmit={onSubmit}>
          <div className="px-login-card-head">
            <h2>Sign in</h2>
            <p>User ID or email · secure workspace access</p>
          </div>
          <label className="px-field">
            User ID / Email
            <input
              required
              name="username"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="superadmin or email"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
            />
          </label>
          <label className="px-field">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error ? <div className="px-login-error">{error}</div> : null}
          <button type="submit" className="px-login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Enter PractoPulse'}
          </button>
          <p className="px-login-foot">Reach · Prime · n8n Autopilot</p>
        </form>
      </div>
    </div>
  );
}
