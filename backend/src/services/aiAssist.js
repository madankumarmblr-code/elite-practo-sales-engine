/**
 * AI Assist — NVIDIA Nemotron 3 Ultra (NIM) & Meta Llama integration & smart channel picker
 */
import db from '../db/db.js';

const NVIDIA_NIM_BASE = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_API_KEY = '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';
export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';

const META_LLAMA_BASE = 'https://api.llama.com/v1';

// ── Google Gemini AI (Multimodal Sales Copy & Intelligence) ─────────────────
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export function getGeminiCredentials() {
  let apiKey = process.env.GEMINI_API_KEY || '';
  let model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  try {
    const row = db.prepare("SELECT secrets, config, enabled FROM api_integrations WHERE provider = 'google_gemini'").get();
    if (row) {
      const secrets = JSON.parse(row.secrets || '{}');
      const config = JSON.parse(row.config || '{}');
      if (secrets.apiKey && secrets.apiKey !== '••••••••') apiKey = secrets.apiKey;
      if (config.model) model = config.model;
    }
  } catch { /* ignore */ }

  if (!apiKey) {
    apiKey = DEFAULT_GEMINI_API_KEY;
  }

  return { apiKey, model };
}

export async function geminiGenerate({ prompt, contents, model, temperature = 0.3, maxTokens = 1024, responseMimeType }) {
  const creds = getGeminiCredentials();
  const activeModel = model || creds.model || DEFAULT_GEMINI_MODEL;
  const apiKey = creds.apiKey || DEFAULT_GEMINI_API_KEY;

  if (!apiKey) throw new Error('Google Gemini API Key is not configured');

  const generationConfig = { temperature, maxOutputTokens: maxTokens };
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }

  const payload = contents
    ? { contents, generationConfig }
    : { contents: [{ parts: [{ text: prompt }] }], generationConfig };

  const url = `${GEMINI_API_BASE}/models/${activeModel}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Google Gemini API error (${res.status})`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function testGeminiConnection() {
  const startTime = Date.now();
  const creds = getGeminiCredentials();

  try {
    const reply = await geminiGenerate({
      prompt: 'System verification: confirm you are Google Gemini AI for Practo sales automation in one short sentence.',
      model: creds.model,
    });
    const latencyMs = Date.now() - startTime;

    try {
      db.prepare(`
        UPDATE api_integrations
        SET status = 'connected', last_tested_at = datetime('now'), last_test_ok = 1
        WHERE provider = 'google_gemini'
      `).run();
    } catch {}

    return {
      success: true,
      provider: 'google_gemini',
      model: creds.model,
      latencyMs,
      message: `Google Gemini AI (${creds.model}) connected (${latencyMs}ms): "${reply.trim()}"`,
    };
  } catch (err) {
    return {
      success: false,
      provider: 'google_gemini',
      model: creds.model,
      latencyMs: Date.now() - startTime,
      message: `Google Gemini AI connection failed: ${err.message}`,
    };
  }
}

/**
 * Retrieve active NVIDIA Nemotron credentials from Database or Environment
 */
export function getNvidiaCredentials() {
  let apiKey = process.env.NVIDIA_NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY || '';
  let model = process.env.NVIDIA_NEMOTRON_MODEL || DEFAULT_NVIDIA_MODEL;

  try {
    const row = db.prepare("SELECT secrets, config, enabled FROM api_integrations WHERE provider = 'nvidia_nemotron'").get();
    if (row) {
      const secrets = JSON.parse(row.secrets || '{}');
      const config = JSON.parse(row.config || '{}');
      if (secrets.apiKey && secrets.apiKey !== '••••••••' && secrets.apiKey.startsWith('nvapi-')) apiKey = secrets.apiKey;
      if (config.model) model = config.model;
    }
  } catch {
    // fallback
  }

  if (!apiKey || !apiKey.startsWith('nvapi-')) {
    apiKey = DEFAULT_NVIDIA_API_KEY;
  }

  return { apiKey, model };
}

/**
 * Call NVIDIA NIM Nemotron Chat Completions API
 */
export async function nemotronChat({ messages, model, maxTokens = 1024, temperature = 0.3 }) {
  const creds = getNvidiaCredentials();
  const activeModel = model || creds.model || DEFAULT_NVIDIA_MODEL;
  const apiKey = creds.apiKey || DEFAULT_NVIDIA_API_KEY;

  const res = await fetch(`${NVIDIA_NIM_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: activeModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.detail || `NVIDIA NIM API error (${res.status})`;
    throw new Error(msg);
  }

  const choice = data.choices?.[0]?.message;
  return choice?.content || choice?.reasoning_content || '';
}

/**
 * Test connectivity to NVIDIA Nemotron NIM
 */
export async function testAiConnection() {
  const startTime = Date.now();
  const creds = getNvidiaCredentials();
  const testMessages = [
    {
      role: 'user',
      content: 'System ping. Confirm you are Nemotron 3 Ultra and operational in one short sentence.',
    },
  ];

  try {
    const reply = await nemotronChat({
      messages: testMessages,
      model: creds.model,
      maxTokens: 60,
      temperature: 0.1,
    });
    const latencyMs = Date.now() - startTime;

    // Update status in db if integration exists
    try {
      db.prepare(`
        UPDATE api_integrations
        SET status = 'connected', last_tested_at = datetime('now')
        WHERE provider IN ('nvidia_nemotron', 'meta_llama')
      `).run();
    } catch {
      // ignore
    }

    return {
      success: true,
      provider: 'nvidia_nemotron',
      model: creds.model,
      latencyMs,
      message: `NVIDIA Nemotron 3 Ultra operational (${latencyMs}ms): "${reply.trim()}"`,
    };
  } catch (err) {
    return {
      success: false,
      provider: 'nvidia_nemotron',
      model: creds.model,
      latencyMs: Date.now() - startTime,
      message: `NVIDIA Nemotron connection failed: ${err.message}`,
    };
  }
}

/**
 * Call Meta Llama API (with seamless automatic fallback to NVIDIA Nemotron)
 */
export async function llamaChat({ messages, model, maxTokens = 1024 }) {
  if (process.env.META_LLAMA_API_KEY && !process.env.NVIDIA_NEMOTRON_API_KEY) {
    try {
      const res = await fetch(`${META_LLAMA_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.META_LLAMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: model || 'Llama-4-Scout-17B-16E-Instruct', messages, max_tokens: maxTokens }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch {
      // fallback
    }
  }

  return await nemotronChat({ messages, model, maxTokens });
}

function cleanDoctorName(raw = '') {
  let s = String(raw || '').trim();
  s = s.replace(/^(Dr\.?|Doctor)\s+/i, '');
  return s || 'Doctor';
}

/**
 * Generate a personalized sales pitch for a lead using NVIDIA Nemotron 3 Ultra
 */
export async function generateSalesPitch({ lead, channel = 'whatsapp', product = 'Practo Pro' }) {
  const docName = cleanDoctorName(lead.name || lead.ownerName);
  try {
    const isReach = String(product).toLowerCase().includes('reach');
    const isPrime = String(product).toLowerCase().includes('prime');

    let productValueProp = 'Practo Pro Clinic Growth Engine';
    if (isReach) {
      productValueProp = 'Practo Reach Exclusive Spotlight (Top #1-3 locality ranking in high-demand patient search)';
    } else if (isPrime) {
      productValueProp = 'Practo Prime (Guaranteed appointments, zero upfront fee, priority digital booking)';
    }

    // ── Priority 1: Google Gemini 3.6 Flash ────────────────────────────────
    try {
      const geminiPrompt = `You are an elite healthcare sales copywriter for Practo.
Product: ${productValueProp}
Generate a concise, highly persuasive, ROI-focused ${channel} pitch for an Indian doctor.
Doctor: Dr. ${docName}
Clinic: ${lead.company || lead.clinicName || 'Clinic'}
Specialty: ${lead.title || lead.speciality || 'General Medicine'}
Location: ${lead.locality ? `${lead.locality}, ${lead.city || ''}` : lead.city || 'India'}
Channel: ${channel}

Key instructions:
- Keep the message under 100 words.
- Highlight patient search demand in their locality.
- Offer an urgent, friendly, low-friction next step (e.g. quick 2-minute chat today).
- Sound professional, courteous, and high-conversion. Do not use generic filler.`;

      const geminiPitch = await geminiGenerate({ prompt: geminiPrompt, temperature: 0.3 });
      if (geminiPitch && geminiPitch.trim().length > 20) {
        return geminiPitch.trim();
      }
    } catch {
      // fallback to Nemotron / Llama
    }

    // ── Priority 2: NVIDIA Nemotron 3 Ultra ──────────────────────────────────
    const messages = [
      {
        role: 'system',
        content: `You are an elite healthcare sales AI powered by NVIDIA Nemotron for ${productValueProp}. Generate a concise, highly persuasive, ROI-focused ${channel} message for an Indian healthcare practitioner. Address the practitioner as Dr. ${docName}. Highlight patient volume in their exact city/locality, practice growth, and an urgent low-friction call to action. Keep responses under 150 words. Do not use generic filler.`,
      },
      {
        role: 'user',
        content: `Generate ${channel} outreach for:
Doctor/Owner: Dr. ${docName}
Clinic: ${lead.company || lead.clinicName || 'Clinic'}
Specialty: ${lead.title || lead.speciality || 'General Medicine'}
City/Locality: ${lead.locality ? `${lead.locality}, ${lead.city || ''}` : lead.city || 'India'}
Lead Score: ${lead.score || 85}/100
Product: ${product}
Target Channel: ${channel}`,
      },
    ];

    const pitch = await nemotronChat({ messages });
    if (pitch && pitch.trim().length > 20) {
      return pitch.trim();
    }
    throw new Error('Empty AI response');
  } catch (err) {
    const clinic = lead.company || lead.clinicName || 'your clinic';
    const specialty = lead.title || lead.speciality || 'practice';
    const locality = lead.locality || lead.city || 'your area';

    if (channel === 'whatsapp') {
      return `Hello Dr. ${docName}! 👋 Reaching out from Practo regarding ${clinic} in ${locality}. We are currently reserving exclusive spotlight search ranking for top ${specialty} practices in your locality, driving a verified 35-45% lift in new patient appointments. Would you be open to a brief 3-minute overview this week? Best regards, Practo Sales Intelligence`;
    }
    if (channel === 'calls') {
      return `Hi Dr. ${docName}, this is Practo Enterprise for ${clinic}. High patient search volume was recorded for ${specialty} in ${locality} this month. We have one priority verified spotlight slot open for your practice. Press 1 to speak with our clinical success director.`;
    }
    return `Dear Dr. ${docName},\n\nWe noticed ${clinic} has an expanding ${specialty} presence in ${locality}. Practo connects over 30M active patients monthly with verified doctors. Let us show you how exclusive positioning can double your direct OPD consultations.\n\nWarm regards,\nPracto Sales Intelligence (NVIDIA Nemotron)`;
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
