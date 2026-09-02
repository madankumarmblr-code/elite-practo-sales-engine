/**
 * AI Pitch & Practo-to-Sales Intelligence Engine
 */

export function analyzePractoLead(lead) {
  const specialty = lead.specialty || 'General Medicine';
  const city = lead.city || 'Metro Area';
  const org = lead.organization || `${lead.name}'s Practice`;
  const volume = lead.patientVolumeMonthly || 1000;
  const currentEHR = lead.customFields?.currentEHR || 'Manual / Legacy';
  
  // Calculate estimated financial leakages
  const estimatedNoShowRate = 0.22; // 22% average in Indian clinic setups
  const avgConsultFee = specialty.toLowerCase().includes('cardio') || specialty.toLowerCase().includes('ortho') || specialty.toLowerCase().includes('derma') ? 1200 : 700;
  const monthlyNoShows = Math.round(volume * estimatedNoShowRate);
  const monthlyRevenueLoss = monthlyNoShows * avgConsultFee;
  const annualRevenueLoss = monthlyRevenueLoss * 12;

  // Compute ICP Fit Score (0 - 100)
  let fitScore = 70;
  if (volume >= 1500) fitScore += 15;
  else if (volume >= 800) fitScore += 10;
  if (currentEHR.toLowerCase().includes('practo') || currentEHR.toLowerCase().includes('excel')) fitScore += 10;
  if (['Cardiology', 'Orthopedics', 'Dermatology', 'Dentistry', 'Gynecology'].includes(specialty)) fitScore += 5;
  fitScore = Math.min(fitScore, 99);

  return {
    fitScore,
    monthlyRevenueLoss,
    annualRevenueLoss,
    monthlyNoShows,
    avgConsultFee,
    specialtyPainPoints: getSpecialtyPainPoints(specialty),
    valueProposition: `Eliminate up to 80% of ${monthlyNoShows} monthly no-shows and recover ₹${(annualRevenueLoss / 100000).toFixed(1)} Lakhs annually with automated 24/7 Practo-synced WhatsApp triage.`,
  };
}

function getSpecialtyPainPoints(specialty) {
  const map = {
    Cardiology: ['High-risk patient follow-up drop-offs', 'Delays in ECG/Echo report dispatch', 'Post-procedure adherence tracking'],
    Orthopedics: ['Physical therapy session drop-outs', 'Pre-op diagnostic confirmation delays', 'Joint replacement review follow-ups'],
    Dermatology: ['Multi-session laser/skin package reminders', 'Cosmetic consultation no-show rates', 'Prescription refill automation'],
    Dentistry: ['Routine 6-month checkup lapse', 'Orthodontic / aligner follow-up compliance', 'Treatment plan quotation delays'],
    Gynecology: ['Trimester-specific prenatal care reminders', 'Fertility consultation high-intent follow-up', 'Vaccination scheduler'],
    Pediatrics: ['Immunization reminder adherence', 'Seasonal flu clinic broadcasts', 'Parent query overload during OPD hours'],
  };
  return map[specialty] || ['Manual reception bottleneck', 'High appointment no-show rate', 'Patient retention drop-off'];
}

export function generateDoctorPitch(lead, repName = 'Ananya Roy') {
  const analysis = analyzePractoLead(lead);
  const org = lead.organization || 'your clinic';
  const name = lead.name || 'Doctor';
  const city = lead.city || 'your city';
  const specialty = lead.specialty || 'specialty';
  const estLossLakhs = (analysis.monthlyRevenueLoss / 100000).toFixed(1);
  const annualLossLakhs = (analysis.annualRevenueLoss / 100000).toFixed(1);

  // 1. Meta WhatsApp AI Interactive ROI Pitch
  const whatsappPitch = `*Practo Prime & AI Outreach Suite* 🩺\n\nRespected ${name},\n\nWe analyzed OPD trends for top *${specialty}* clinics in *${city}* and noticed *${org}* has exceptional patient feedback.\n\n*Key Clinical OPD Finding:* Clinics with your monthly patient volume (~${lead.patientVolumeMonthly || 1200} consultations) typically experience *~${analysis.monthlyNoShows} appointment drop-offs monthly*, translating to an estimated *₹${estLossLakhs} Lakhs/mo revenue leakage*.\n\n🚀 *How Practo Prime Supreme Solves This:*
• *Zero-Drop 24/7 AI Receptionist* on WhatsApp & Practo
• *1-Tap Instant Patient Confirmation* & Auto-reschedule
• *Pre-consultation digital payment* & insurance verification
• *Top 3 Search Slot Visibility* across ${city}\n\n📊 *Specialty ROI Projection:* +₹${annualLossLakhs} Lakhs annual revenue recovery at 82% no-show reduction.\n\n👉 *Reply:*
1️⃣ Type *DEMO* for a 60-second video walkthrough
2️⃣ Type *SLOTS* to check available Prime slots in ${city}
3️⃣ Type *REP* to connect directly with your dedicated Field Sales Executive`;

  // 2. 30-Second Voice AI Cold Call Script (Sarvam Voice / Retell)
  const coldCallScript = `[Greeting & Value Hook]
"Hello Dr. ${name.replace('Dr. ', '')}, this is Priya from Practo's Clinical Growth Team. I'm reaching out specifically regarding ${org} in ${city}."

[Pain & Clinical Metrics]
"We noticed your practice is managing ~${lead.patientVolumeMonthly || 1200} monthly consultations in ${specialty}. High-volume practices in your area typically lose ~${analysis.monthlyNoShows} patient appointments per month due to manual reception confirmation bottlenecks — representing over ₹${estLossLakhs} Lakhs in monthly throughput loss."

[Solution & Low Friction Ask]
"Practo Prime provides an automated 24/7 WhatsApp AI receptionist that connects directly with your schedule to recover over 80% of these drop-offs. Would you be open to a quick 5-minute visual walkthrough on Thursday at 3:00 PM, or is Friday morning better?"

[Human Escalation Fallback]
"If you would like custom multi-chair clinic package terms or custom EHR integration, I can instantly route you to ${repName}, our Senior Healthcare Solutions Executive for ${city}."`;

  // 3. Executive ROI Email Strategy with Commercial Proposal
  const emailPitch = {
    subject: `OPD Optimization & Practo Prime Partnership Proposal — ${org} (${city})`,
    body: `Dear ${name},

I hope this email finds you well.

While evaluating leading ${specialty} healthcare institutions across ${city}, ${org} stood out for its exemplary patient satisfaction ratings.

Based on an estimated volume of ${lead.patientVolumeMonthly || 1200} monthly consultations, front-desk manual confirmation gaps typically lead to ~${analysis.monthlyNoShows} unfilled slots per month — representing up to ₹${annualLossLakhs} Lakhs in annual lost clinic throughput.

PROPOSED PARTNERSHIP: PRACTO PRIME SUPREME & AI EXPEDITE
=========================================================
1. 24/7 Conversational AI Receptionist: Instant zero-latency appointment bookings directly synced with your calendar.
2. Verified High-Intent Patient Queue: Prioritized search visibility for ${specialty} in ${lead.zone || city}.
3. Automated No-Show Protection: Two-way WhatsApp patient triage reducing no-shows by up to 82%.
4. Digital OPD Check-In & EHR Bridge: Eliminate reception queues during peak consulting hours.

COMMERCIAL SUMMARY:
• Package: Practo Prime Supreme (Annual Partnership)
• Projected Revenue Recovery: ₹${annualLossLakhs} Lakhs / Year
• Implementation Timeline: 48 Hours with zero downtime

Would you be available for a concise 10-minute executive briefing this Wednesday or Thursday? Alternatively, you can reply directly to connect with our dedicated field representative, ${repName}.

Warm regards,

${repName}
Enterprise & Clinical Growth Solutions
Practo Technologies Pvt. Ltd.`,
  };

  // 4. Common Objection Handling Matrix
  const objections = [
    {
      objection: '"We already have enough patient footfall."',
      rebuttal: 'Practo Prime does not just bring new patients — it ensures the patients who book actually show up on time by automating confirmations, reducing reception chaos.',
    },
    {
      objection: '"Our reception staff handles all booking calls."',
      rebuttal: 'Receptionists are indispensable for patient care, but after 7:00 PM or during peak consulting hours, 32%+ of calls go unanswered. Our AI captures those patients 24/7.',
    },
    {
      objection: '"We need custom pricing for multiple branches."',
      rebuttal: 'We offer specialized multi-branch enterprise pooling with volume discounts. Let me escalate you to our Senior Solutions Manager immediately.',
    },
  ];

  // 5. AI Escalation Evaluation Matrix
  const escalationRules = {
    signals: [
      'Doctor requests custom multi-center / branch discount pricing',
      'Doctor requests dedicated account manager or senior executive callback',
      'Complex clinic EHR / custom software bridging requirements',
      'Negotiation on per-booking commercial fee structure',
    ],
    recommendedRepAction: `Schedule on-site clinic visit or executive video meeting with Dr. ${name.replace('Dr. ', '')}. Present Practo Prime Supreme commercial proposal with customized quarterly payment terms.`,
  };

  return {
    leadId: lead.id,
    analysis,
    whatsappPitch,
    coldCallScript,
    emailPitch,
    objections,
    escalationRules,
    generatedAt: new Date().toISOString(),
  };
}

export function simulateVoiceCallStream(lead) {
  const analysis = analyzePractoLead(lead);
  const estLoss = (analysis.monthlyRevenueLoss / 100000).toFixed(1);
  return [
    { sender: 'AI SDR', text: `Good afternoon! Am I speaking with Dr. ${lead.name.replace('Dr. ', '')} or the clinic director at ${lead.organization}?`, timestamp: 0 },
    { sender: 'Doctor', text: `Yes, Dr. ${lead.name.replace('Dr. ', '')} speaking. What is this regarding?`, timestamp: 2.8 },
    { sender: 'AI SDR', text: `Hi Doctor! I am calling from Practo's Clinical AI Team. We work with leading ${lead.specialty} practices in ${lead.city}. We noticed ${lead.organization} could recover an estimated ₹${estLoss} Lakhs monthly by automating patient confirmations and slot bookings on WhatsApp.`, timestamp: 5.5 },
    { sender: 'Doctor', text: `We do lose slots to cancellations on weekends. How does this connect with our current clinic system?`, timestamp: 10.2 },
    { sender: 'AI SDR', text: `It syncs directly with your Practo calendar and EHR. It sends interactive 2-way WhatsApp confirmations and handles automatic rescheduling in seconds.`, timestamp: 13.8 },
    { sender: 'Doctor', text: `Can you send me the commercial proposal on WhatsApp and email, and have a senior sales executive call me tomorrow at 4 PM to discuss branch pricing?`, timestamp: 18.0 },
    { sender: 'AI SDR', text: `Absolutely, Doctor! I have sent the ROI proposal to your WhatsApp and email, and I am escalating this to our Senior Field Executive, Ananya Roy, to connect with you tomorrow at 4 PM. Thank you!`, timestamp: 22.0 },
  ];
}
