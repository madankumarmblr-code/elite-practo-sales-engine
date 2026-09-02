import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export function VoiceDialerModal({ lead, onClose }) {
  const { addToast } = useCrm();
  const [callState, setCallState] = useState('connecting'); // connecting, in_call, completed
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [visibleTranscriptCount, setVisibleTranscriptCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer;
    if (callState === 'in_call') {
      timer = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    async function startCall() {
      try {
        setLoading(true);
        // Attempt Sarvam Live Outbound Call trigger
        if (lead?.phone) {
          try {
            const sarvamRes = await api.triggerSarvamCall({
              userPhoneNumber: lead.phone,
              leadId: lead.id,
              agentVariables: {
                doctor_name: lead.name,
                clinic_name: lead.organization || lead.clinic,
                city: lead.city || 'Mumbai',
                specialty: lead.specialty || 'Cardiology',
                product_pitch: lead.recommendedProduct || 'Practo Prime',
              },
            });
            if (sarvamRes?.attempt_id) {
              addToast(`Sarvam Voice Outbound Queued (Attempt: ${sarvamRes.attempt_id})`, 'success');
            }
          } catch (sarvamErr) {
            console.warn('Sarvam live call fallback:', sarvamErr.message);
          }
        }

        const data = await api.simulateVoiceCall(lead?.id);
        setTranscript(data.transcript || []);
        setTimeout(() => {
          setCallState('in_call');
          setLoading(false);
        }, 1200);
      } catch (err) {
        addToast(err.message || 'Call error', 'error');
        onClose();
      }
    }
    startCall();
  }, [lead, addToast, onClose]);

  // Progressively reveal dialogue lines
  useEffect(() => {
    if (callState === 'in_call' && visibleTranscriptCount < transcript.length) {
      const lineTimer = setTimeout(() => {
        setVisibleTranscriptCount((c) => c + 1);
      }, 2400);
      return () => clearTimeout(lineTimer);
    } else if (visibleTranscriptCount >= transcript.length && transcript.length > 0) {
      setTimeout(() => setCallState('completed'), 2000);
    }
  }, [callState, visibleTranscriptCount, transcript]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--accent-cyan)' }}>
              Sarvam Voice Agents • Outbound Live Call
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Doctor & Clinic Call Target */}
        <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            {lead?.name?.charAt(0) || 'D'}
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {lead?.name}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {lead?.organization} • <span style={{ color: 'var(--accent-cyan)' }}>{lead?.specialty}</span> ({lead?.city})
          </p>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">
              {callState === 'connecting' ? 'Dialing...' : callState === 'in_call' ? `Active Call • ${formatTime(duration)}` : 'Call Ended'}
            </span>
            <span className="badge badge-emerald">Retell AI / Sub-400ms Audio</span>
          </div>

          {/* Animated Audio Equalizer Waveform */}
          {callState === 'in_call' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '36px', marginTop: '16px' }}>
              {[12, 24, 18, 28, 14, 22, 32, 16, 26, 10, 20, 30, 15, 25].map((h, i) => (
                <span
                  key={i}
                  className="audio-waveform-bar"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${(i % 5) * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live Conversational Speech-to-Text Transcript */}
        <div style={{ padding: '20px', maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-input)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Live Speech-to-Text Transcript
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transcript.slice(0, visibleTranscriptCount).map((msg, idx) => {
              const isAi = msg.sender === 'AI SDR';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  <span style={{ fontSize: '10px', color: isAi ? 'var(--accent-cyan)' : 'var(--accent-emerald)', fontWeight: 700, marginBottom: '2px' }}>
                    {msg.sender}
                  </span>
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isAi ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: isAi ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px',
                      lineHeight: 1.4,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Outcome / Controls */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Outcome: <strong style={{ color: 'var(--accent-emerald)' }}>Demo Booked & WhatsApp Dispatched</strong>
          </div>

          <button onClick={onClose} className="btn btn-danger btn-sm">
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
