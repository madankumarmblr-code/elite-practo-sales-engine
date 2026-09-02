import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { recordAuditLog } from './auditLogger.js';

const now = () => new Date().toISOString();

export const PRACTO_PRODUCTS = {
  PRIME: {
    id: 'PRIME',
    name: 'Practo Prime',
    tagline: 'Premier Clinic Experience & Guaranteed Patient Conversions',
    monthlyPrice: 7999,
    annualPrice: 79999,
    highlights: [
      '15-Minute Wait Time Guarantee with smart queue tech',
      'Instant 24x7 verified appointment booking on Practo App',
      'Priority badge & top placement on Practo search results',
      'Automated patient reminder drips with 92% show-up rate',
      'Dedicated relationship manager & VIP support line',
    ],
  },
  REACH: {
    id: 'REACH',
    name: 'Practo Reach',
    tagline: 'Guaranteed Impressions & Hyper-Local Patient Traffic',
    monthlyPrice: 5999,
    annualPrice: 59999,
    highlights: [
      'Guaranteed high-intent patient search impressions in your locality',
      'Specialty dominance slot for high-margin procedures',
      'Competitor search keyword protection in 5km radius',
      'Real-time impression & patient intent analytics dashboard',
      'Targeted boost during seasonal healthcare peaks',
    ],
  },
  RAY_PMS: {
    id: 'RAY_PMS',
    name: 'Practo Ray PMS',
    tagline: 'Modern Cloud Clinic Management & Digital EMR',
    monthlyPrice: 3499,
    annualPrice: 34999,
    highlights: [
      'Paperless Electronic Medical Records (EMR) with voice prescription',
      'Automated WhatsApp Rx, lab reports & billing receipts',
      'Inventory, pharmacy & clinical consumables tracking',
      'Multi-doctor schedule & chair management',
      'Compliant with ABDM (Ayushman Bharat Digital Mission)',
    ],
  },
  INSTA_HMS: {
    id: 'INSTA_HMS',
    name: 'Practo Insta HMS',
    tagline: 'Enterprise Hospital Management Suite for Nursing Homes & Chains',
    monthlyPrice: 19999,
    annualPrice: 199999,
    highlights: [
      'Full IPD, OPD, OT, ICU, Pharmacy & Radiology orchestration',
      'Integrated TPA & cashless insurance claims processing',
      'NABH/JCI clinical audit compliance workflows',
      'Centralized multi-facility management with role-based access',
      'Zero-downtime cloud infrastructure with 99.99% SLA',
    ],
  },
};

export const DOCTOR_PERSONAS = [
  {
    id: 'persona_word_of_mouth',
    name: 'Dr. Rajesh Sharma',
    specialty: 'Cardiology / General Medicine',
    experience: '25+ Years',
    archetype: 'Traditionalist / Word-of-Mouth Reliant',
    objection: 'I already have plenty of walk-in patients and strong word-of-mouth. Why do I need Practo?',
    underlyingFear: 'Losing clinical prestige or feeling like commercializing medicine.',
    winningStrategy: 'Position Practo not as customer acquisition, but as modern patient retention, VIP experience, and queue management.',
    rebuttal: {
      acknowledgment: 'Dr. Sharma, your 25 years of exceptional clinical reputation is exactly why patients trust you in this area.',
      pivot: 'However, the challenge senior doctors face today isn’t patient footfall—it is waiting room congestion, patient drop-offs, and frustrated walk-ins who leave after 45 minutes.',
      valueProp: 'Practo Prime installs our Smart 15-Minute Queue system that streamlines your OPD, reduces receptionist burnout, and lets your existing high-value patients book digitally without jamming your clinic phone line.',
      proofPoint: 'Over 12,000 senior consultants across India use Prime not to advertise, but to provide a 5-star clinic arrival experience that matches their clinical stature.',
      callToAction: 'Can I set up a 10-minute workflow demo for your front-office manager this Thursday?',
    },
  },
  {
    id: 'persona_roi_sensitive',
    name: 'Dr. Ananya Iyer',
    specialty: 'Dental Surgeon / Implantologist',
    experience: '8 Years',
    archetype: 'ROI & Price Sensitive Clinic Owner',
    objection: 'Your annual plan is expensive. How quickly will I recover this cost in actual clinic revenue?',
    underlyingFear: 'Sunk cost without guaranteed booking conversion.',
    winningStrategy: 'Anchor against high-ticket procedure margins. 1 single implant or root canal recovers 2 months of subscription.',
    rebuttal: {
      acknowledgment: 'That is completely fair, Dr. Iyer. Every marketing rupee must translate into chair-time revenue.',
      pivot: 'Let’s look at the numbers: A single dental implant or clear aligner case at your clinic averages ₹25,000 to ₹45,000 in revenue.',
      valueProp: 'With Practo Reach & Prime, our algorithm drives an average of 42 high-intent dental search inquiries per month within your 3km radius. Even at a conservative 5% conversion rate, that is 2 new procedure patients per month.',
      proofPoint: 'That yields ₹50,000+ monthly revenue against an investment of just ₹6,600/month—an immediate 7.5x ROI in the first 60 days.',
      callToAction: 'Let us run a 30-day guaranteed impression test on your top 3 implant keywords in Indiranagar.',
    },
  },
  {
    id: 'persona_busy_tech_hesitant',
    name: 'Dr. Vikram Patel',
    specialty: 'Orthopedic & Joint Replacement',
    experience: '16 Years',
    archetype: 'Overworked Surgeon & Tech-Hesitant Staff',
    objection: 'My front-desk staff is already struggling with paper files and calls. They will resist learning a complex software.',
    underlyingFear: 'Operational disruption and clinic downtime during software transition.',
    winningStrategy: 'Emphasize 1-day assisted onboarding, WhatsApp-native interface, and dedicated Practo field engineer.',
    rebuttal: {
      acknowledgment: 'We completely understand, Dr. Patel. If software slows down your front desk even by 5 minutes, it hurts your surgical schedule.',
      pivot: 'That is why Practo Ray was built specifically with a zero-training WhatsApp integration.',
      valueProp: 'Your receptionist doesn’t need to type lengthy forms. Patients scan a QR code at your desk, check themselves in, and prescriptions are sent straight to the patient’s WhatsApp with 1 click.',
      proofPoint: 'Our local field specialist comes to your clinic in person, migrates your entire patient directory in under 2 hours, and trains your receptionist on-site.',
      callToAction: 'We can run a parallel trial for 1 week without changing any of your existing physical records.',
    },
  },
  {
    id: 'persona_no_show_pain',
    name: 'Dr. Sneha Roy',
    specialty: 'Dermatologist & Cosmetologist',
    experience: '11 Years',
    archetype: 'High No-Show / Patient Drop-off Frustration',
    objection: 'Patients book online slots on various portals but 30% to 40% never show up, wasting my consultation slots.',
    underlyingFear: 'Wasted consultation slots and empty appointment gaps.',
    winningStrategy: 'Demonstrate Practo Prime Automated Pre-payment & 3-Step WhatsApp confirmation protocol.',
    rebuttal: {
      acknowledgment: 'Dr. Roy, no-shows are the biggest silent revenue killer for cosmetic dermatologists.',
      pivot: 'When a patient cancels 10 minutes before a 45-minute laser consultation, that revenue is lost forever.',
      valueProp: 'Practo Prime solves this with our 3-Step Smart Confirmation protocol: Instant WhatsApp calendar sync, automated 2-hour pre-appointment confirmation with GPS clinic navigation, and optional token pre-payment.',
      proofPoint: 'Clinics on Practo Prime see their no-show rate plummet from 38% down to under 6.4%, instantly recovering ₹80,000+ in lost monthly consultation slots.',
      callToAction: 'Shall we enable the auto-confirmation protocol on your existing schedule to test it this week?',
    },
  },
];

/**
 * Generate a personalized pitch for a doctor / clinic
 */
export function generateDoctorPitch({
  clinicName,
  doctorName = '',
  specialty = 'General Medicine',
  city = 'Bangalore',
  locality = '',
  product = 'PRIME',
  currentPatientsPerDay = 25,
  avgConsultationFee = 700,
  reqUser = null,
}) {
  const prod = PRACTO_PRODUCTS[product] || PRACTO_PRODUCTS.PRIME;
  const patientsPerDay = Number(currentPatientsPerDay) || 25;
  const consultFee = Number(avgConsultationFee) || 700;

  // Financial ROI projections
  const estimatedNewPatientsMonth = product === 'REACH' ? 35 : product === 'PRIME' ? 55 : product === 'RAY_PMS' ? 20 : 120;
  const additionalMonthlyRevenue = estimatedNewPatientsMonth * consultFee;
  const roiMultiplier = ((additionalMonthlyRevenue / prod.monthlyPrice)).toFixed(1);

  const elevatorPitch = `Dr. ${doctorName || 'Doctor'}, for a premier ${specialty} practice like ${clinicName} in ${locality || city}, ${prod.name} guarantees that high-intent patients searching in your area choose your clinic first. By deploying ${prod.highlights[0]}, we eliminate waiting room drop-offs and drive an estimated ${estimatedNewPatientsMonth} additional verified consultations every month.`;

  const whatsappHook = `*Greetings Dr. ${doctorName || 'Doctor'}* 🩺\n\nNoticed ${clinicName}'s strong standing in *${locality || city}*. We analyzed patient search trends for *${specialty}* in your area and observed *450+ weekly patient queries* actively looking for confirmed appointment slots.\n\nWith *${prod.name}*, we can guarantee top visibility and automated WhatsApp booking for your clinic.\n\nWould you be open to a 5-minute preview of the patient demand report for your locality this week?\n\n_— Practo Healthcare Sales Team_`;

  const coldEmailSequence = {
    subject: `Patient flow & queue optimization for ${clinicName} (${city})`,
    body: `Dear Dr. ${doctorName || 'Doctor'},\n\nHope this email finds you well.\n\nWe recently mapped patient search density for ${specialty} practices in ${locality || city}. Patients today prioritize two critical factors when choosing a clinic: instant online booking confidence and guaranteed minimal waiting time.\n\nWith ${prod.name}, we partner with leading clinics like ${clinicName} to deliver:\n1. ${prod.highlights[0]}\n2. ${prod.highlights[1]}\n3. ${prod.highlights[2]}\n\nBased on your clinic profile, our model forecasts an estimated ₹${additionalMonthlyRevenue.toLocaleString()} in additional monthly OPD value with an expected ROI of ${roiMultiplier}x.\n\nCould we connect for a brief 10-minute walkthrough this Wednesday at 3 PM?\n\nWarm regards,\nPracto Sales Executive`,
  };

  const outboundCallScript = {
    opener: `Hello, good morning! Am I speaking with Dr. ${doctorName || 'the practice head'} at ${clinicName}?`,
    hook: `Doctor, I'm calling from Practo's Medical Partnerships team. I'm reaching out specifically regarding the surging patient search queries for ${specialty} in ${locality || city}.`,
    valuePitch: `We are currently selecting 2 leading clinics in your zone to activate our ${prod.name} program, providing guaranteed patient discovery, 15-minute wait time tech, and direct WhatsApp booking.`,
    qualifyingQuestion: `Are you currently accepting new patient consultations, and what is your average wait time during peak evening hours?`,
    closeForDemo: `I'd love to show you the live patient search heat-map for your pincode. Would tomorrow at 11:30 AM or 4:30 PM suit you better for a quick 7-minute screen share?`,
  };

  const pitchId = `pitch_${nanoid(10)}`;

  // Record audit log
  recordAuditLog({
    actorName: reqUser?.name || 'Practo AE',
    actorRole: reqUser?.role || 'agent',
    action: 'AI_PITCH_GENERATED',
    entityType: 'pitch',
    entityId: pitchId,
    details: `Generated ${prod.name} pitch for ${clinicName} (${specialty}, ${city})`,
  });

  // Save to pitch history
  try {
    db.prepare(`
      INSERT INTO doctor_pitch_history (
        id, clinic_name, doctor_name, specialty, city, product, pitch_deck, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pitchId,
      clinicName,
      doctorName,
      specialty,
      city,
      product,
      JSON.stringify({ elevatorPitch, whatsappHook, coldEmailSequence, outboundCallScript, roiMultiplier }),
      reqUser?.id || 'system',
      now()
    );
  } catch (err) {
    console.error('Failed to save pitch history:', err.message);
  }

  return {
    pitchId,
    clinicName,
    doctorName,
    specialty,
    city,
    locality,
    product: prod,
    roi: {
      estimatedNewPatientsMonth,
      consultationFee: consultFee,
      additionalMonthlyRevenue,
      monthlyCost: prod.monthlyPrice,
      annualCost: prod.annualPrice,
      roiMultiplier,
    },
    pitches: {
      elevatorPitch,
      whatsappHook,
      coldEmailSequence,
      outboundCallScript,
    },
  };
}

/**
 * Handle live objection simulator
 */
export function handleDoctorObjection({ personaId, objectionQuery, specialty = 'General', product = 'PRIME' }) {
  const matchedPersona = DOCTOR_PERSONAS.find((p) => p.id === personaId) || DOCTOR_PERSONAS[0];

  const response = {
    persona: matchedPersona,
    rebuttal: matchedPersona.rebuttal,
    suggestedFollowUp: [
      'Offer a 14-day zero-risk trial of Practo Prime',
      'Share a peer testimonial from a doctor in the same city/specialty',
      'Invite clinic front-office manager to an assisted setup call',
    ],
    psychologicalAnchor: matchedPersona.winningStrategy,
  };

  return response;
}
