import React, { useState, useEffect, useRef } from 'react';
import { api, setToken } from '../api/client.js';
import PractoLogo from '../components/PractoLogo.jsx';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  // ── Google Antigravity Particle Constellation Simulation ──────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Color palette matching Google Antigravity constellation (blues, purples, cyans, coral, emerald, amber)
    const colors = [
      '#2563EB', '#38BDF8', '#8B5CF6', '#EC4899', '#F43F5E',
      '#10B981', '#F59E0B', '#6366F1', '#06B6D4', '#0D9488'
    ];

    const particles = [];
    const particleCount = 280;

    // Origin near center-right matching the screenshot
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.2);
      const distance = 40 + Math.pow(Math.random(), 1.6) * (Math.min(canvas.width, canvas.height) * 0.75);
      const speed = 0.0008 + Math.random() * 0.0015;
      const size = 1.5 + Math.random() * 2.8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const opacity = 0.35 + Math.random() * 0.55;
      const spiralFactor = 0.003 + Math.random() * 0.006;

      particles.push({ angle, distance, speed, size, color, opacity, spiralFactor });
    }

    const render = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width * 0.62; // Center-right bias like screenshot
      const centerY = canvas.height * 0.48;

      for (const p of particles) {
        p.angle += p.speed;
        p.distance += Math.sin(p.angle * 2) * 0.15;

        // Calculate radial trajectory with gentle logarithmic spiral curve
        const curvedAngle = p.angle + p.distance * p.spiralFactor;
        const x = centerX + Math.cos(curvedAngle) * p.distance;
        const y = centerY + Math.sin(curvedAngle) * p.distance * 0.85;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // Draw faint directional streak
        const prevX = centerX + Math.cos(curvedAngle - 0.015) * (p.distance - 2);
        const prevY = centerY + Math.sin(curvedAngle - 0.015) * (p.distance - 2) * 0.85;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.globalAlpha = p.opacity * 0.3;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form);
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Invalid User ID or Password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-antigravity">
      <canvas ref={canvasRef} className="antigravity-canvas" />

      <div className="login-glass-card">
        {/* Official Practo Logo & Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <PractoLogo size="xl" showTagline={true} tagline="Sales Intelligence AI Engine" />
          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 6 }}>
            Enterprise Outreach · Sarvam Voice · WhatsApp AI
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              User ID / Email
            </label>
            <input
              id="login-user"
              className="input"
              type="text"
              placeholder="e.g. karan or superadmin"
              value={form.login}
              onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              id="login-pass"
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button
            id="login-submit"
            className="btn btn-primary w-full btn-lg"
            type="submit"
            disabled={loading}
            style={{ borderRadius: 12, padding: '12px 20px', fontSize: 14.5 }}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '⚡ Sign In to Engine'}
          </button>
        </form>
      </div>
    </div>
  );
}
