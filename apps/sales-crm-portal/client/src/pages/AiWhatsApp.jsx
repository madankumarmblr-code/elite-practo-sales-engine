import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function AiWhatsApp() {
  const { addToast } = useCrm();
  const [selectedThreadId, setSelectedThreadId] = useState('wa-1');
  const [replyText, setReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('roi_calc');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Clinic WhatsApp Conversations
  const [threads, setThreads] = useState([
    {
      id: 'wa-1',
      doctor: 'Dr. Aarav Mehta',
      clinic: 'Mehta Multispecialty Cardiology',
      city: 'Mumbai',
      phone: '+91 98201 44556',
      unread: 0,
      product: 'Practo Prime',
      status: 'High Intent',
      lastMessage: 'Let us do the walkthrough Thursday 3 PM.',
      lastTime: '10:42 AM',
      messages: [
        { sender: 'bot', text: 'Hello Dr. Mehta! 🩺 This is the Practo Enterprise automated assistant. We analyzed patient search density in Powai and found 1,200+ cardiology searches monthly.', time: '10:30 AM', status: 'read' },
        { sender: 'bot', text: '📊 Here is your clinic\'s projected patient retention report for Practo Prime:', time: '10:31 AM', attachment: { type: 'roi_card', title: 'Practo Prime ROI Projection', value: '₹14.2L / yr Net Growth', sub: 'Reduces appointment no-shows from 24% to 4%' }, status: 'read' },
        { sender: 'doctor', text: 'Hi! That is impressive. How does the instant WhatsApp patient reminder work with our front desk?', time: '10:38 AM' },
        { sender: 'bot', text: 'It connects directly to your calendar! When a patient books on Practo or your website, they receive an interactive confirmation on WhatsApp with 1-tap reschedule & Google Maps directions. Zero front-desk manual work.', time: '10:39 AM', status: 'read' },
        { sender: 'doctor', text: 'Let us do the walkthrough Thursday 3 PM.', time: '10:42 AM' },
      ],
    },
    {
      id: 'wa-2',
      doctor: 'Dr. Shalini Varma',
      clinic: 'Apex Orthopedic Institute',
      city: 'Bangalore',
      phone: '+91 99805 11223',
      unread: 1,
      product: 'Practo Reach',
      status: 'Demo Requested',
      lastMessage: 'Can you send the slot guarantee SLA document?',
      lastTime: '09:15 AM',
      messages: [
        { sender: 'bot', text: 'Hello Dr. Shalini Varma! 🏥 Practo Reach is launching exclusive top search placement for Orthopedic & Joint Replacement in Whitefield.', time: '08:45 AM', status: 'read' },
        { sender: 'bot', text: '🎥 Check out this 45-second video overview of how leading Bangalore surgical centers are filling high-value slots:', time: '08:46 AM', attachment: { type: 'video_card', title: 'Practo Reach Whitefield Walkthrough', duration: '0:45 min', thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80' }, status: 'read' },
        { sender: 'doctor', text: 'Can you send the slot guarantee SLA document?', time: '09:15 AM' },
      ],
    },
    {
      id: 'wa-3',
      doctor: 'Dr. Sandeep Mhatre',
      clinic: 'Mhatre Cardio Care',
      city: 'Mumbai',
      phone: '+91 98200 22001',
      unread: 0,
      product: 'Practo Prime',
      status: 'Proposal Review',
      lastMessage: 'Received the contract link, reviewing with finance.',
      lastTime: 'Yesterday',
      messages: [
        { sender: 'bot', text: 'Hello Dr. Mhatre! Following up from our call with Priya Sharma regarding the Powai cardiology prime onboarding.', time: 'Yesterday 3:30 PM', status: 'read' },
        { sender: 'bot', text: '📄 Here is the official Practo Prime agreement and digital signature room link.', time: 'Yesterday 3:31 PM', attachment: { type: 'doc_card', title: 'Practo_Prime_Agreement_Powai.pdf', size: '1.4 MB' }, status: 'read' },
        { sender: 'doctor', text: 'Received the contract link, reviewing with finance.', time: 'Yesterday 4:15 PM' },
      ],
    },
  ]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const messageContent = replyText;
    const newMsg = {
      sender: 'bot',
      text: messageContent,
      time: 'Just now',
      status: 'sent',
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, messages: [...t.messages, newMsg], lastMessage: messageContent, lastTime: 'Just now' }
          : t
      )
    );

    setReplyText('');

    // Attempt live Meta WhatsApp Cloud API send
    try {
      if (activeThread?.phone) {
        const res = await api.sendWhatsAppMessage({
          to: activeThread.phone,
          text: messageContent,
        });
        if (res?.ok) {
          addToast(`WhatsApp message dispatched to ${activeThread.doctor} via Meta Cloud API!`, 'success');
          return;
        }
      }
    } catch (err) {
      console.warn('Meta WhatsApp live send fallback:', err.message);
    }

    addToast('WhatsApp message sent (simulation mode)', 'success');

    // Simulate doctor reply
    setTimeout(() => {
      const autoReply = {
        sender: 'doctor',
        text: 'Thank you for the quick response. Looking forward to our next steps.',
        time: 'Just now',
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? { ...t, messages: [...t.messages, autoReply], lastMessage: autoReply.text, lastTime: 'Just now' }
            : t
        )
      );
      addToast(`New inbound WhatsApp message from ${activeThread.doctor}`, 'info');
    }, 4000);
  };

  const handleSendTemplate = (tplKey) => {
    setSendingMessage(true);
    let templateMsg = {};

    if (tplKey === 'roi_calc') {
      templateMsg = {
        sender: 'bot',
        text: `📈 Personalized Practo Prime ROI calculation for ${activeThread.clinic}:\n• Est. Monthly Patient Searches: 1,800+\n• No-Show Drop: -82%\n• Projected Net Value: ₹18.5L / year.`,
        attachment: { type: 'roi_card', title: 'Practo Prime ROI Breakdown', value: '₹18.5L Net Annual Value', sub: 'Verified by Practo Healthcare Benchmark' },
        time: 'Just now',
        status: 'sent',
      };
    } else if (tplKey === 'demo_video') {
      templateMsg = {
        sender: 'bot',
        text: `🎥 Hi ${activeThread.doctor}, here is a 60-second video demo showing how our automated patient scheduler fills empty clinic slots on autopilot.`,
        attachment: { type: 'video_card', title: '60-Sec Interactive Demo', duration: '1:00 min', thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80' },
        time: 'Just now',
        status: 'sent',
      };
    } else {
      templateMsg = {
        sender: 'bot',
        text: `🗓️ Hi ${activeThread.doctor}, can we book a quick 10-minute executive screen-share to demonstrate Practo Prime for your clinic? Click below to select your slot.`,
        time: 'Just now',
        status: 'sent',
      };
    }

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, messages: [...t.messages, templateMsg], lastMessage: templateMsg.text, lastTime: 'Just now' }
          : t
      )
    );

    setSendingMessage(false);
    addToast(`Template "${tplKey}" delivered to ${activeThread.phone}`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald">Meta WhatsApp Cloud API</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official Green-Tick Verified Channel</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            AI WhatsApp Outreach & Multi-Clinic Messenger
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => addToast('Synchronizing Meta WhatsApp Webhook events...', 'info')} className="btn btn-secondary btn-sm">
            🔄 Sync Meta Webhook
          </button>
          <button onClick={() => addToast('Broadcast campaign modal opened', 'success')} className="btn btn-primary btn-sm">
            🚀 Launch WhatsApp Drip Campaign
          </button>
        </div>
      </div>

      {/* ── Key WhatsApp Metrics ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Messages Sent</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>4,890</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>↑ +38.2% this month</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Delivery & Read Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>96.4%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Avg read within 4 mins</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Response Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#06B6D4', marginTop: '4px' }}>41.8%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>2,044 Doctor Replies</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Demos Booked</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>184</div>
          <div style={{ fontSize: '12px', color: '#A855F7', marginTop: '4px', fontWeight: 600 }}>Via automated triage</div>
        </div>
      </div>

      {/* ── WhatsApp Workspace: Threads List + Interactive Chat Box ─────── */}
      <div
        className="glass-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          minHeight: '620px',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-glow)',
        }}
      >
        {/* Left Sidebar: Threads List */}
        <div style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <input type="text" className="input-field" placeholder="Search doctor or clinic..." style={{ fontSize: '13px' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {threads.map((thread) => {
              const isSelected = thread.id === activeThread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '4px solid #10B981' : '4px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{thread.doctor}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{thread.lastTime}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '2px' }}>{thread.clinic}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {thread.lastMessage}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '10px' }}>{thread.product}</span>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{thread.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Active Chat Window & Template Dispatcher */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(11, 15, 25, 0.8)' }}>
          {/* Chat Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                🩺
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeThread.doctor}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {activeThread.phone} • {activeThread.clinic} ({activeThread.city})
                </div>
              </div>
            </div>

            {/* Quick Template Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleSendTemplate('roi_calc')} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px', padding: '4px 8px' }}>
                📊 ROI Card
              </button>
              <button onClick={() => handleSendTemplate('demo_video')} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px', padding: '4px 8px' }}>
                🎥 Video Demo
              </button>
              <button onClick={() => handleSendTemplate('zoom_invite')} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px', padding: '4px 8px' }}>
                🗓️ Book Demo
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {activeThread.messages.map((msg, i) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isBot ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: isBot ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isBot ? '#065F46' : 'rgba(30, 41, 59, 0.9)',
                      border: isBot ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      lineHeight: 1.5,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div>{msg.text}</div>

                    {/* Rich Cards / Attachments */}
                    {msg.attachment?.type === 'roi_card' && (
                      <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>{msg.attachment.title}</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{msg.attachment.value}</div>
                        <div style={{ fontSize: '11.5px', color: '#E2E8F0', marginTop: '2px' }}>{msg.attachment.sub}</div>
                      </div>
                    )}

                    {msg.attachment?.type === 'video_card' && (
                      <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                        <div style={{ height: '100px', background: `url(${msg.attachment.thumbnail}) center/cover`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>▶</span>
                        </div>
                        <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}>{msg.attachment.title} ({msg.attachment.duration})</div>
                      </div>
                    )}

                    {msg.attachment?.type === 'doc_card' && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📄</span>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{msg.attachment.title} <span style={{ color: '#94A3B8' }}>({msg.attachment.size})</span></div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: isBot ? 'flex-end' : 'flex-start', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{msg.time}</span>
                    {isBot && <span style={{ color: '#34D399' }}>✓✓</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          <form
            onSubmit={handleSendReply}
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(15, 23, 42, 0.7)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder={`Reply to ${activeThread.doctor} on WhatsApp...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-emerald btn-sm" style={{ padding: '10px 18px' }}>
              Send 💬
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
