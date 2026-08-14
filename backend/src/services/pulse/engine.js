import { MOCK_LEADS } from './mockLeads.js';

export const INDIAN_CITIES = [
  'Bangalore',
  'Mumbai',
  'Delhi-NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
];

export const MEDICAL_SPECIALTIES = [
  'Dermatologist',
  'Dentist',
  'Orthopedist',
  'Pediatrician',
  'Gynecologist',
  'ENT',
  'General Physician',
  'Cardiologist',
  'Ophthalmologist',
];

function classifyLead(lead) {
  let recommendedProduct = 'REACH';
  if (lead.reviewCount >= 200 || lead.googleRating >= 4.5) recommendedProduct = 'PRIME';
  if (lead.practoProfileStatus === 'Ray User' || lead.practoProfileStatus === 'Reach Active') {
    recommendedProduct = 'HYBRID';
  }
  const pitchHook = `${lead.specialty} in ${lead.locality}, ${lead.city}: ${
    recommendedProduct === 'PRIME'
      ? 'strong reviews — pitch Prime booking + smart number'
      : recommendedProduct === 'HYBRID'
        ? 'existing Practo footprint — bundle Reach visibility + Prime conversion'
        : 'low discovery — pitch Reach locality/specialty slots'
  }.`;
  const leadScore = Math.min(
    99,
    55 + Math.round(lead.googleRating * 6) + Math.min(30, Math.floor(lead.reviewCount / 20))
  );
  return { recommendedProduct, pitchHook, leadScore };
}

export function listPulseLeads() {
  return MOCK_LEADS;
}

export function sourceAndEnrich({ city, locality = '', specialties = [] }) {
  const specialty = specialties[0] || 'General Physician';
  let leads = MOCK_LEADS.filter((l) => {
    if (city && l.city !== city) return false;
    if (specialties.length && !specialties.includes(l.specialty)) return false;
    return true;
  });

  if (locality) {
    const hits = leads.filter((l) =>
      l.locality.toLowerCase().includes(String(locality).toLowerCase())
    );
    if (hits.length) leads = hits;
  }

  if (!leads.length) {
    leads = [
      {
        id: `lead_${city}_${specialty}_${Date.now()}`.toLowerCase().replace(/\s+/g, '_'),
        doctorName: 'Dr. Prospect',
        clinicName: `${specialty} Care · ${city}`,
        specialty,
        city,
        locality: locality || 'City Center',
        address: `${locality || 'City Center'}, ${city}`,
        phone: '+919999000111',
        email: 'prospect@clinic.example',
        googleRating: 4.0,
        reviewCount: 40,
        practoProfileStatus: 'Unclaimed',
        recommendedProduct: 'REACH',
        status: 'NEW',
        leadScore: 60,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const enriched = leads.map((lead) => {
    const c = classifyLead(lead);
    return {
      ...lead,
      status: 'ENRICHED',
      recommendedProduct: c.recommendedProduct,
      pitchHook: `[Simulated Claude] ${c.pitchHook}`,
      leadScore: c.leadScore,
      decisionMaker: lead.decisionMaker || 'Managing Doctor',
    };
  });

  const byId = new Map(MOCK_LEADS.map((l) => [l.id, l]));
  for (const l of enriched) byId.set(l.id, l);

  return {
    leads: Array.from(byId.values()),
    enrichedCount: enriched.length,
    message: `Simulated Apify scrape + Clay enrich + Claude classify for ${specialty} in ${city} · ${enriched.length} lead(s)`,
  };
}

export function generatePitch(lead, channel = 'whatsapp') {
  const product = lead.recommendedProduct || 'PRIME';
  const script =
    channel === 'email'
      ? `Subject: ${lead.specialty} growth in ${lead.locality}\n\nHi ${lead.doctorName},\n\nClinics like ${lead.clinicName} in ${lead.city} are using Practo ${product === 'PRIME' ? 'Prime' : product === 'REACH' ? 'Reach' : 'Reach + Prime'} to drive patient discovery and bookings.\n\n${lead.pitchHook || ''}\n\nOpen to a 12-min walkthrough this week?\n\n— Practo Inside Sales`
      : channel === 'linkedin'
        ? `Hi ${lead.doctorName} — helping ${lead.specialty} practices in ${lead.city} with Practo ${product}. ${lead.pitchHook || ''} Worth a short chat?`
        : `Hi ${lead.doctorName}, quick note from Practo for ${lead.clinicName} (${lead.locality}). ${lead.pitchHook || ''} Can I share a 1-pager on ${product}?`;

  const pitchDeckUrl = `https://gamma.app/docs/practopulse-${lead.city}-${lead.specialty}-${lead.id}`
    .toLowerCase()
    .replace(/\s+/g, '-');

  return {
    pitchDeckUrl,
    script,
    message: `Simulated Gamma deck + ElevenLabs voice note + Claude ${channel} script for ${lead.clinicName}`,
  };
}
