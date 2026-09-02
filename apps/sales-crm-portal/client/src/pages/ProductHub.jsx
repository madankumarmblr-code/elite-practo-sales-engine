import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '../context/CrmContext';
import { PractoLogo } from '../components/PractoLogo';

export default function ProductHub() {
  const navigate = useNavigate();
  const { currentUser } = useCrm();
  const canvasRef = useRef(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 163, 196, ${p.o})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const firstName = currentUser?.name?.split(' ')[0] || 'there';
  const timeNow = new Date().getHours();
  const greeting = timeNow < 12 ? 'Good morning' : timeNow < 17 ? 'Good afternoon' : 'Good evening';

  const cards = [
    {
      id: 'lead-scraper',
      icon: '🔍',
      title: 'Lead Scraper',
      subtitle: 'Practo Enterprise Discovery Engine',
      description: 'Search clinics & hospitals by city, locality, and specialty. Identify leads on Practo and off-Practo with owner contacts, marketing person details, and full clinic intelligence.',
      features: ['Multi-source discovery (GMB, Practo, JustDial)', 'Owner name, phone & email', 'Marketing person contact', 'Import CSV / Export CSV', 'Assign to Auto-Pilot or Manual Dialing'],
      cta: 'Open Lead Scraper',
      path: '/leads',
      gradient: 'linear-gradient(135deg, #00A3C4 0%, #0891B2 50%, #0E7490 100%)',
      glowColor: 'rgba(0, 163, 196, 0.35)',
      badge: 'DISCOVERY',
      badgeColor: '#E0F7FA',
      badgeText: '#006064',
      stat: { label: 'Active Leads', value: '2,847' },
    },
    {
      id: 'crm-pipeline',
      icon: '📋',
      title: 'CRM Pipeline',
      subtitle: 'AI-Powered Sales Command Center',
      description: 'Manage your full sales pipeline with AI voice calling, WhatsApp automation, email pitching, and commercial proposal generation — all from one unified workspace.',
      features: ['Auto-Pilot AI calling (Prime & Reach)', 'WhatsApp & Email automation', 'Commercial Proposal Suite', 'Live recordings & transcripts', 'Conversion funnel analytics'],
      cta: 'Open CRM Pipeline',
      path: '/pipeline',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
      glowColor: 'rgba(124, 58, 237, 0.35)',
      badge: 'AI-POWERED',
      badgeColor: '#EDE9FE',
      badgeText: '#4C1D95',
      stat: { label: 'Pipeline Deals', value: '₹42.8L' },
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F1629 0%, #1a2040 40%, #0F172A 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Animated Canvas Background */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Glowing orbs */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,163,196,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-150px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <PractoLogo size="md" variant="full" showTag tagText="SALES" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #00A3C4, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
            {currentUser?.name?.[0] || 'S'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>{currentUser?.name || 'Super Admin'}</div>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentUser?.role || 'superadmin'}</div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '64px 40px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,163,196,0.1)', border: '1px solid rgba(0,163,196,0.25)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22D3EE', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#22D3EE', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Platform · Enterprise Edition</span>
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.15 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: '18px', color: '#94A3B8', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
          Your AI-powered Practo Sales Command Center. Where would you like to start today?
        </p>
      </div>

      {/* Cards */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '32px', padding: '0 80px 80px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {cards.map((card) => (
          <div
            key={card.id}
            id={`hub-card-${card.id}`}
            onClick={() => navigate(card.path)}
            style={{
              flex: '1 1 400px',
              maxWidth: '500px',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '36px',
              cursor: 'pointer',
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)';
              e.currentTarget.style.boxShadow = `0 30px 80px ${card.glowColor}, 0 0 0 1px rgba(255,255,255,0.12)`;
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
            }}
          >
            {/* Card gradient top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: card.gradient, borderRadius: '24px 24px 0 0' }} />

            {/* Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', background: card.badgeColor, color: card.badgeText, padding: '4px 10px', borderRadius: '6px' }}>
                {card.badge}
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#F8FAFC' }}>{card.stat.value}</div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.stat.label}</div>
              </div>
            </div>

            {/* Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: `0 8px 24px ${card.glowColor}`, flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.3px' }}>{card.title}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{card.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.65, marginBottom: '24px', fontWeight: 500 }}>
              {card.description}
            </p>

            {/* Feature bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
              {card.features.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.gradient, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 500 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button style={{
              width: '100%',
              padding: '14px',
              background: card.gradient,
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              boxShadow: `0 4px 20px ${card.glowColor}`,
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {card.cta} →
            </button>
          </div>
        ))}
      </div>

      {/* Bottom quick links */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', gap: '8px', paddingBottom: '40px', flexWrap: 'wrap' }}>
        {[
          { label: '📊 Dashboard', path: '/' },
          { label: '🤖 AI Pilot', path: '/aipilot' },
          { label: '📞 AI Calls', path: '/ai-calls' },
          { label: '💬 WhatsApp', path: '/ai-whatsapp' },
          { label: '📧 Email', path: '/ai-mailing' },
          { label: '📈 Reports', path: '/reports' },
          { label: '⚙️ Settings', path: '/settings' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
