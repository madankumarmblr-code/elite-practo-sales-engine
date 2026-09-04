/**
 * AI Assist — Meta Llama integration & smart channel picker
 */

const META_LLAMA_BASE = 'https://api.llama.com/v1';

/**
 * Call Meta Llama API for AI-powered sales assistance
 */
export async function llamaChat({ messages, model = 'Llama-4-Scout-17B-16E-Instruct', maxTokens = 1024 }) {
  const apiKey = process.env.META_LLAMA_API_KEY || '';
  if (!apiKey) throw new Error('META_LLAMA_API_KEY is not configured.');

  const res = await fetch(`${META_LLAMA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Meta Llama API error (${res.status})`);
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate a personalized sales pitch for a lead
 */
export async function generateSalesPitch({ lead, channel = 'whatsapp', product = 'Practo Pro' }) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are an expert healthcare sales AI for ${product}. Generate concise, personalized outreach messages for Indian clinic owners and doctors. Be professional, warm, and highlight ROI. Keep responses under 200 words.`,
      },
      {
        role: 'user',
        content: `Generate a ${channel} outreach message for:
Clinic: ${lead.company || 'this clinic'}
Doctor/Owner: ${lead.name || 'the owner'}
Specialty: ${lead.title || 'General'}
City: ${lead.city || 'India'}
Score: ${lead.score || 'N/A'}/100
Channel: ${channel}`,
      },
    ];

    return await llamaChat({ messages });
  } catch (err) {
    const name = lead.name || 'Doctor';
    const clinic = lead.company || 'your clinic';
    const specialty = lead.title || 'practice';

    if (channel === 'whatsapp') {
      return `Hello ${name}! 👋 Reaching out from Practo regarding ${clinic}. We're currently helping ${specialty} practices in your area see a 35-40% increase in verified patient appointments with zero upfront software fee. Would you be open to a brief 3-minute chat this week? Best regards, Practo Sales Intelligence`;
    }
    if (channel === 'calls') {
      return `Hi ${name}, calling from Practo Pro for ${clinic}. We noticed high patient search volume for ${specialty} in your area and would love to connect you with verified appointments. Press 1 to schedule a callback with our clinic success specialist.`;
    }
    return `Dear ${name},\n\nWe noticed ${clinic} has an expanding ${specialty} presence. Practo Pro connects over 30M patients monthly to verified clinics. Let's schedule a brief 5-minute consultation to demonstrate how Practo can fill your schedule.\n\nWarm regards,\nPracto Sales Intelligence`;
  }
}

/**
 * Smart channel picker based on lead signals
 */
function leadSignals(lead = {}) {
  const hasPhone = Boolean(String(lead.phone || '').trim());
  const hasEmail = Boolean(String(lead.email || '').trim());
  const score = Number(lead.score || 0);
  return { hasPhone, hasEmail, score };
}

export function pickSmartChannel(lead = {}) {
  const s = leadSignals(lead);
  const reasons = [];

  if (s.hasPhone && s.score >= 70) {
    reasons.push('High score + phone — voice call is highest conversion');
    return { channel: 'calls', confidence: 0.88, reasons, label: 'Voice Call' };
  }
  if (s.hasPhone) {
    reasons.push('Phone available — WhatsApp warm intro');
    return { channel: 'whatsapp', confidence: 0.80, reasons, label: 'WhatsApp' };
  }
  if (s.hasEmail) {
    reasons.push('Email only — email outreach');
    return { channel: 'email', confidence: 0.65, reasons, label: 'Email' };
  }
  reasons.push('Limited contact data');
  return { channel: 'whatsapp', confidence: 0.40, reasons, label: 'WhatsApp' };
}
