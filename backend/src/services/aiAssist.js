/**
 * Lightweight channel suggestion for Lead Generator discovery results.
 * (Outreach / Autopilot AI helpers removed.)
 */

function leadSignals(lead = {}) {
  const notes = String(lead.notes || '');
  const hasPhone = Boolean(String(lead.phone || lead.owner?.phone || '').trim());
  const hasEmail = Boolean(String(lead.email || lead.owner?.email || '').trim());
  const hasWebsite = /Website:\s*https?:/i.test(notes) || Boolean(lead.website);
  const hasPracto = /Practo profile:\s*Yes/i.test(notes) || lead.practo?.hasProfile === true;
  const score = Number(lead.score || 0);
  return { hasPhone, hasEmail, hasWebsite, hasPracto, score };
}

export function pickSmartChannel(lead = {}) {
  const s = leadSignals(lead);
  const reasons = [];

  if (s.hasPhone && !s.hasPracto) {
    reasons.push('Has phone, no Practo — WhatsApp warm intro is highest reply rate');
    return { channel: 'whatsapp', confidence: 0.86, reasons, label: 'WhatsApp' };
  }
  if (s.hasEmail && s.hasPracto) {
    reasons.push('Practo listed + email — Gmail nurture / proposal path');
    return { channel: 'gmail', confidence: 0.8, reasons, label: 'Gmail' };
  }
  if (s.hasPhone && s.score >= 70) {
    reasons.push('High score + phone — Calls qualifier');
    return { channel: 'calls', confidence: 0.78, reasons, label: 'Calls' };
  }
  if (s.hasPhone) {
    reasons.push('Phone available — default WhatsApp');
    return { channel: 'whatsapp', confidence: 0.7, reasons, label: 'WhatsApp' };
  }
  if (s.hasEmail) {
    reasons.push('Email only — Gmail');
    return { channel: 'gmail', confidence: 0.68, reasons, label: 'Gmail' };
  }
  reasons.push('Limited contact data');
  return { channel: 'calls', confidence: 0.45, reasons, label: 'Calls' };
}

export function applySmartChannelToDiscoveryLead(lead) {
  const pick = pickSmartChannel({
    phone: lead.owner?.phone || lead.phone,
    email: lead.owner?.email || lead.email,
    notes: [
      lead.practo?.hasProfile ? 'Practo profile: Yes' : 'Practo profile: No',
      lead.website ? `Website: ${lead.website}` : '',
    ].join('\n'),
    score: lead.score,
    practo: lead.practo,
    website: lead.website,
  });
  return {
    ...lead,
    suggestedChannel: pick.channel,
    channelReason: pick.reasons[0] || '',
    channelConfidence: pick.confidence,
  };
}
