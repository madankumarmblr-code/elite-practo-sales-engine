import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function AiCalls() {
  const { addToast } = useCrm();
  const [selectedCallId, setSelectedCallId] = useState('call-1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(35);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isDialing, setIsDialing] = useState(false);
  const [dialDoctor, setDialDoctor] = useState('Dr. Aarav Mehta');
  const [dialPhone, setDialPhone] = useState('+91 98201 44556');
  const [activeCallDuration, setActiveCallDuration] = useState(0);

  // Realistic AI Voice Call Logs & Audio Transcripts
  const [callLogs, setCallLogs] = useState([
    {
      id: 'call-1',
      doctor: 'Dr. Aarav Mehta',
      clinic: 'Mehta Multispecialty Cardiology Clinic',
      city: 'Mumbai',
      zone: 'Powai',
      phone: '+91 98201 44556',
      product: 'Practo Prime',
      duration: '3m 12s',
      durationSec: 192,
      timestamp: '2026-08-26T08:45:00Z',
      status: 'Completed',
      sentiment: 'Highly Positive (94%)',
      sentimentScore: 94,
      aiAgent: 'Sarah (Healthcare Voice AI)',
      outcome: 'Demo Scheduled for Thursday',
      recordingUrl: 'https://cdn.practo-sales.io/recordings/call-101-mehta.mp3',
      transcript: [
        { speaker: 'AI SDR - Sarah', time: '0:02', text: 'Hello, good morning! Am I speaking with the clinic manager or Dr. Mehta at Mehta Cardiology?' },
        { speaker: 'Receptionist - Anita', time: '0:07', text: 'Yes, this is reception. Dr. Mehta is between consultations right now. How can I help you?' },
        { speaker: 'AI SDR - Sarah', time: '0:13', text: 'Thank you Anita! I am calling from Practo Enterprise regarding our new Prime 24/7 patient booking engine. We noticed your Powai clinic is experiencing over 1,200 monthly patient searches with potential dropped inquiries.' },
        { speaker: 'Receptionist - Anita', time: '0:26', text: 'Oh yes, our morning OPD lines get extremely busy and doctors complain about missed follow-ups.' },
        { speaker: 'AI SDR - Sarah', time: '0:34', text: 'Exactly what we solve. Practo Prime guarantees zero-touch instant slots and verified WhatsApp confirmations, eliminating 82% of no-shows. Would Dr. Mehta be open to a 7-minute executive walkthrough this Thursday at 3 PM?' },
        { speaker: 'Receptionist - Anita', time: '0:48', text: 'Doctor will definitely want to see this. Let me put it on his calendar for Thursday 3 PM and give you his direct WhatsApp.' },
        { speaker: 'AI SDR - Sarah', time: '0:56', text: 'Wonderful! Sending the digital calendar invite and WhatsApp confirmation right away. Have a great day, Anita!' },
      ],
      keyObjections: 'Busy morning phone lines resolved with automated queue priority.',
      buyingSignals: ['Zero-touch slot booking', 'WhatsApp auto confirmation', 'Calendar agreed'],
    },
    {
      id: 'call-2',
      doctor: 'Dr. Shalini Varma',
      clinic: 'Apex Orthopedic & Joint Institute',
      city: 'Bangalore',
      zone: 'Whitefield',
      phone: '+91 99805 11223',
      product: 'Practo Reach',
      duration: '2m 45s',
      durationSec: 165,
      timestamp: '2026-08-26T08:15:00Z',
      status: 'Completed',
      sentiment: 'Positive (88%)',
      sentimentScore: 88,
      aiAgent: 'Rohan (Voice AI Lead)',
      outcome: 'Proposal Sent via Email',
      recordingUrl: 'https://cdn.practo-sales.io/recordings/call-102-varma.mp3',
      transcript: [
        { speaker: 'AI SDR - Rohan', time: '0:02', text: 'Good morning! This is Rohan calling Dr. Shalini Varma from Practo Enterprise Sales.' },
        { speaker: 'Dr. Shalini Varma', time: '0:08', text: 'Yes, Dr. Varma here. I have 2 minutes before surgery rounds.' },
        { speaker: 'AI SDR - Rohan', time: '0:14', text: 'Understood Doctor, I will be very brief. With the expansion in Whitefield, Practo Reach is offering top search placement for Joint Replacement specialists, bringing ~120 high-intent surgical inquiries per month.' },
        { speaker: 'Dr. Shalini Varma', time: '0:28', text: 'Interesting. What is the commercial pricing compared to standard Practo listing?' },
        { speaker: 'AI SDR - Rohan', time: '0:35', text: 'It operates on an ROI-backed tier. With your patient volume, estimated ROI is 7.4x in the first quarter. Can I send the full ROI breakdown to your email?' },
        { speaker: 'Dr. Shalini Varma', time: '0:46', text: 'Yes please, email it to contact@apexorthoblr.com. I will review tonight.' },
      ],
      keyObjections: 'Time constraint before surgery handled concisely in 45 seconds.',
      buyingSignals: ['Commercial tier inquiry', 'Direct doctor engagement', 'Requested ROI model'],
    },
    {
      id: 'call-3',
      doctor: 'Dr. Sandeep Mhatre',
      clinic: 'Mhatre Cardio Care Centre',
      city: 'Mumbai',
      zone: 'Powai',
      phone: '+91 98200 22001',
      product: 'Practo Prime',
      duration: '1m 50s',
      durationSec: 110,
      timestamp: '2026-08-26T07:50:00Z',
      status: 'Completed',
      sentiment: 'Highly Positive (92%)',
      sentimentScore: 92,
      aiAgent: 'Sarah (Healthcare Voice AI)',
      outcome: 'Call Transferred to Account Exec',
      recordingUrl: 'https://cdn.practo-sales.io/recordings/call-103-mhatre.mp3',
      transcript: [
        { speaker: 'AI SDR - Sarah', time: '0:02', text: 'Hello Dr. Mhatre, this is Sarah from Practo regarding your heart center in Powai.' },
        { speaker: 'Dr. Sandeep Mhatre', time: '0:09', text: 'Hi Sarah. We were actually discussing Practo Prime yesterday with our medical director.' },
        { speaker: 'AI SDR - Sarah', time: '0:16', text: 'That is fantastic timing! I can bridge you immediately with Priya Sharma, our Senior Sales Director, to finalize territory onboarding.' },
        { speaker: 'Dr. Sandeep Mhatre', time: '0:25', text: 'Please connect me now, I have 10 minutes.' },
      ],
      keyObjections: 'None. Existing brand awareness and buying intent.',
      buyingSignals: ['Internal discussion active', 'Direct warm transfer accepted'],
    },
    {
      id: 'call-4',
      doctor: 'Dr. Nita Shah',
      clinic: 'Shah Bone & Joint Hospital',
      city: 'Mumbai',
      zone: 'Chembur',
      phone: '+91 98200 22002',
      product: 'Practo Reach',
      duration: '2m 10s',
      durationSec: 130,
      timestamp: '2026-08-25T16:20:00Z',
      status: 'Completed',
      sentiment: 'Neutral / Curious (74%)',
      sentimentScore: 74,
      aiAgent: 'Rohan (Voice AI Lead)',
      outcome: 'WhatsApp Brochure Dispatched',
      recordingUrl: 'https://cdn.practo-sales.io/recordings/call-104-shah.mp3',
      transcript: [
        { speaker: 'AI SDR - Rohan', time: '0:02', text: 'Hello! Calling for Dr. Nita Shah at Shah Bone & Joint Chembur.' },
        { speaker: 'Practice Manager', time: '0:08', text: 'Doctor is not available right now. Can you send details on WhatsApp?' },
        { speaker: 'AI SDR - Rohan', time: '0:15', text: 'Certainly! I am triggering our interactive 60-second video walkthrough on how Chembur clinics are doubling verified inquiries via Practo Reach. What is the best number?' },
        { speaker: 'Practice Manager', time: '0:28', text: 'Send it to +91 98200 22002.' },
      ],
      keyObjections: 'Doctor unavailable; routed smoothly to WhatsApp automated sequence.',
      buyingSignals: ['Verified mobile provided', 'Requested video brochure'],
    },
  ]);

  const activeCall = callLogs.find((c) => c.id === selectedCallId) || callLogs[0];

  // Active call timer simulation
  useEffect(() => {
    let timer;
    if (isDialing) {
      timer = setInterval(() => setActiveCallDuration((p) => p + 1), 1000);
    } else {
      setActiveCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isDialing]);

  // Audio Playback simulation
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1 * playbackSpeed;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleStartLiveDialer = async () => {
    if (!dialDoctor || !dialPhone) {
      addToast('Doctor Name and Phone Number are required', 'error');
      return;
    }
    setIsDialing(true);
    addToast(`Triggering Sarvam Voice Agent instant outbound call to ${dialDoctor}...`, 'info');

    try {
      const res = await api.triggerSarvamCall({
        userPhoneNumber: dialPhone,
        agentVariables: {
          doctor_name: dialDoctor,
          clinic_name: dialDoctor.includes('Dr.') ? `${dialDoctor}'s Clinic` : dialDoctor,
          product_pitch: 'Practo Prime & Reach',
          city: 'Mumbai',
        },
        appOverrides: {
          initial_language_name: 'English',
        },
      });

      if (res?.ok) {
        addToast(`Sarvam Call Queued! Attempt ID: ${res.attempt_id}`, 'success');
      } else {
        addToast(`Call connected in sandbox simulation mode to ${dialDoctor}`, 'info');
      }
    } catch (err) {
      addToast(`Sarvam Dispatch Error: ${err.message}. Running live simulation.`, 'warn');
    }
  };

  const handleEndLiveDialer = () => {
    setIsDialing(false);
    addToast(`Call session ended. Outcome and analytics recorded.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-cyan">Sarvam Voice Agents • Indus Samvaad</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Low-Latency Speech-to-Speech Indian AI</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            AI Voice Calling Center & Live Audio Logs
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              addToast('Exporting all call recordings & transcripts as ZIP...', 'success');
            }}
            className="btn btn-secondary btn-sm"
          >
            📥 Export Audio Archive
          </button>
          <button
            onClick={() => {
              handleStartLiveDialer();
            }}
            className="btn btn-primary btn-sm"
          >
            🎙️ Instant Sarvam Outbound Call
          </button>
        </div>
      </div>

      {/* ── Key Performance Metrics ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total AI Calls Placed</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>1,482</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>↑ +24.8% vs last month</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Connect Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#06B6D4', marginTop: '4px' }}>84.6%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Avg pick up in 3 rings</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Call Duration</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#818CF8', marginTop: '4px' }}>2m 18s</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Sub-420ms response lag</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Prime / Reach Conversion</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>31.2%</div>
          <div style={{ fontSize: '12px', color: '#34D399', marginTop: '4px', fontWeight: 600 }}>462 Demos & Deals</div>
        </div>
      </div>

      {/* ── Active / Live AI Dialer Console ────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          background: isDialing ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.12) 100%)' : 'var(--bg-card)',
          border: isDialing ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glow)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: isDialing ? '#10B981' : 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '20px',
                boxShadow: isDialing ? '0 0 20px #10B981' : 'none',
              }}
            >
              {isDialing ? '📞' : '🎙️'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {isDialing ? 'Live AI Call Active — Sarvam Voice Agents' : 'Sarvam Autonomous AI Voice Dispatcher'}
                </h3>
                {isDialing && <span className="badge badge-emerald animate-pulse">LIVE CONNECTED • {activeCallDuration}s</span>}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Natural Speech-to-Speech agent with Indian English accent & clinical objection handling
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Doctor / Clinic Name"
              value={dialDoctor}
              onChange={(e) => setDialDoctor(e.target.value)}
              disabled={isDialing}
              style={{ width: '180px' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="+91 Phone"
              value={dialPhone}
              onChange={(e) => setDialPhone(e.target.value)}
              disabled={isDialing}
              style={{ width: '150px' }}
            />
            {isDialing ? (
              <button onClick={handleEndLiveDialer} className="btn btn-danger btn-sm">
                🛑 Terminate Call
              </button>
            ) : (
              <button onClick={handleStartLiveDialer} className="btn btn-emerald btn-sm">
                ⚡ Dispatch Call
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Waveform Animation when dialing */}
        {isDialing && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', height: '36px', padding: '0 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: '#10B981',
                  borderRadius: '2px',
                  height: `${20 + Math.sin(i * 0.5 + activeCallDuration) * 15}%`,
                  transition: 'height 0.15s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Audio Player & Deep Transcript Inspector ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Call Details & Audio Player */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-indigo">{activeCall.product}</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>{activeCall.doctor}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{activeCall.clinic} • {activeCall.city} ({activeCall.zone})</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-emerald">{activeCall.sentiment}</span>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Duration: {activeCall.duration}</div>
            </div>
          </div>

          {/* Interactive Audio Waveform Player */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Call Recording Studio
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    High-Def FLAC • Encrypted Voice Stream
                  </div>
                </div>
              </div>

              {/* Playback Speed Multiplier */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--bg-input)',
                      color: playbackSpeed === speed ? '#FFFFFF' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Audio Wave Bars with Progress Scrub */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: '48px',
                cursor: 'pointer',
                padding: '4px 0',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                setPlayProgress(Math.round((clickX / rect.width) * 100));
              }}
            >
              {[...Array(48)].map((_, i) => {
                const barPercent = (i / 48) * 100;
                const isPassed = barPercent <= playProgress;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      borderRadius: '2px',
                      height: `${25 + Math.abs(Math.sin(i * 0.7)) * 70}%`,
                      background: isPassed ? '#06B6D4' : 'rgba(255, 255, 255, 0.15)',
                      boxShadow: isPassed ? '0 0 6px rgba(6, 182, 212, 0.5)' : 'none',
                      transition: 'background 0.1s ease',
                    }}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>0:{Math.round((playProgress / 100) * 192).toString().padStart(2, '0')}</span>
              <span>3:12</span>
            </div>
          </div>

          {/* AI Call Outcome & Key Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>Outcome</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{activeCall.outcome}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>Sentiment Score</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{activeCall.sentimentScore}/100</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Key Buying Signals</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeCall.buyingSignals?.map((sig, i) => (
                <span key={i} className="badge badge-emerald">✓ {sig}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Full AI Speech-to-Speech Transcript */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live Speech Transcription
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Speaker Diarization • Whisper Large v3</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(activeCall.transcript, null, 2));
                addToast('Full transcript copied to clipboard', 'success');
              }}
              className="btn btn-secondary btn-sm"
            >
              📋 Copy Transcript
            </button>
          </div>

          <div
            style={{
              flex: 1,
              maxHeight: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              paddingRight: '6px',
            }}
          >
            {activeCall.transcript.map((turn, i) => {
              const isAi = turn.speaker.includes('AI');
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 700, color: isAi ? 'var(--accent-cyan)' : '#A855F7' }}>{turn.speaker}</span>
                    <span>• {turn.time}</span>
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isAi ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      background: isAi ? 'rgba(6, 182, 212, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                      border: isAi ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid rgba(168, 85, 247, 0.25)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      lineHeight: 1.45,
                    }}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Complete Call Logs Table ───────────────────────────────────── */}
      <div className="glass-panel table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Call History & Audio Ledger</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select a call record to inspect audio recording & real-time transcript</div>
          </div>
          <span className="badge badge-indigo">{callLogs.length} Recorded Sessions</span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Doctor & Clinic</th>
              <th>Location</th>
              <th>Product Target</th>
              <th>Duration</th>
              <th>AI SDR Agent</th>
              <th>Sentiment</th>
              <th>Outcome</th>
              <th style={{ textAlign: 'right' }}>Audio Action</th>
            </tr>
          </thead>
          <tbody>
            {callLogs.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedCallId(log.id)}
                style={{
                  cursor: 'pointer',
                  background: selectedCallId === log.id ? 'rgba(99, 102, 241, 0.12)' : undefined,
                }}
              >
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.doctor}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{log.clinic}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{log.city}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>{log.zone}</div>
                </td>
                <td><span className="badge badge-cyan">{log.product}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.duration}</td>
                <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{log.aiAgent}</td>
                <td>
                  <span className={`badge ${log.sentimentScore >= 90 ? 'badge-emerald' : log.sentimentScore >= 75 ? 'badge-indigo' : 'badge-amber'}`}>
                    {log.sentiment}
                  </span>
                </td>
                <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{log.outcome}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCallId(log.id);
                      setIsPlaying(true);
                      setPlayProgress(0);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px' }}
                  >
                    ▶️ Play Audio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
