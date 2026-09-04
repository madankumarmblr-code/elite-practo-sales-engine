import React, { useState } from 'react';
import { api, setToken } from '../api/client.js';
import PractoLogo from '../components/PractoLogo.jsx';
import GoogleAntigravityBackground from '../components/GoogleAntigravityBackground.jsx';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      {/* Dynamic Google Antigravity Orbital Particle Vortex */}
      <GoogleAntigravityBackground />

      {/* Centered Glassmorphic Login Card */}
      <div className="login-glass-card">
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, textAlign: 'center' }}>
          <PractoLogo size="xl" align="center" showTagline={true} tagline="Sales Intelligence AI Engine" />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: '#475569',
              background: 'rgba(241, 245, 249, 0.85)',
              padding: '4px 12px',
              borderRadius: 9999,
              marginTop: 12,
              border: '1px solid rgba(203, 213, 225, 0.6)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Enterprise Outreach · Sarvam Voice · WhatsApp AI
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: 20,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* User ID / Email Input */}
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="login-user"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              User ID / Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-user"
                className="input"
                type="text"
                placeholder="e.g. superadmin or karan"
                value={form.login}
                onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 12,
                  fontSize: 14,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="login-pass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-pass"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 14px',
                  borderRadius: 12,
                  fontSize: 14,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button (Google Antigravity Pill Aesthetic) */}
          <button
            id="login-submit"
            className="antigravity-login-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#ffffff transparent #ffffff transparent' }} />
            ) : (
              <>
                <span>Sign In to Engine</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Security & Compliance Footer */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            color: '#94A3B8',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>256-bit HIPAA & DPDP Compliant · Enterprise Platform</span>
        </div>
      </div>
    </div>
  );
}
