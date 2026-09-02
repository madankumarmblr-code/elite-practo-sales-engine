/**
 * Practo Sales AI — Pitch Scripts & Product Knowledge Base
 * Complete AI scripts for Sarvam AI voice agent variable injection
 * Products: Practo Prime (Supreme / AI variant) & Practo Reach
 */

export const PRODUCT_SCRIPTS = {

  // ─── PRACTO PRIME — SUPREME VARIANT ───────────────────────────────────────
  PRIME_SUPREME: {
    productName: 'Practo Prime Supreme',
    agentName: 'Aria',
    agentPersona: 'Senior Healthcare Solutions Consultant at Practo',
    openingPitch: `Hello, am I speaking with the clinic manager or doctor at [CLINIC_NAME]? 
    
My name is Aria, calling from Practo Enterprise. I'm reaching out because we've identified that [CLINIC_NAME] in [ZONE] is receiving over [MONTHLY_SEARCH_ESTIMATE] monthly patient searches on Practo, and our data shows there may be appointment gaps we can help fill immediately.

I wanted to share a quick update about Practo Prime Supreme — our flagship appointment technology that guarantees zero missed patients, 24x7 instant online booking, and a dedicated Prime badge that places your clinic at the very top of local search results.

Would you have just 3 minutes to hear how clinics like yours in [CITY] have increased bookings by 40% within the first 30 days?`,

    objectionHandlers: {
      'already_on_practo': `That's excellent! Since you're already using Practo, Prime Supreme is the next level upgrade. You'll notice the Prime badge immediately drives a 60% higher click-through rate versus standard listings. Shall I send you the comparison data?`,
      'not_interested': `I completely understand. Many of our top-performing clinic partners initially felt the same way until they saw the patient acquisition data. Could I share just one case study from a similar [SPECIALTY] clinic in [ZONE] that added 200+ confirmed appointments monthly?`,
      'already_have_patients': `That's a great problem to have! Prime Supreme actually helps you manage high volume more efficiently — automated slot management, zero phone chaos, and verified WhatsApp confirmations eliminate 82% of no-shows. It protects your revenue, not just grows it.`,
      'cost_concern': `I completely hear you on investment decisions. The Prime Supreme structure is performance-based — you pay only for unique, verified patient connections. Most clinics see full ROI within the first 6 weeks. I can configure a custom demo for [CLINIC_NAME] specifically. When's a good time this week?`,
      'need_to_think': `Of course. While you think it over — Prime slots for [ZONE] are filling up quickly, especially for [SPECIALTY]. I'll send you a 2-minute video summary and our case studies. Should I use WhatsApp or email?`,
      'call_later': `Absolutely, no pressure. I'll send our Prime Supreme overview on WhatsApp right away, and I'll follow up [FOLLOWUP_TIME]. Does that work?`,
    },

    closingPitch: `Based on everything we've discussed, I'd like to propose a [TERM]-month Prime Supreme engagement for [CLINIC_NAME]. 
    
Call connections at ₹[CALL_CHARGE] per unique verified call, and booking confirmations at ₹[BOOK_CHARGE] per unique booking — with a wallet subscription of ₹[WALLET_AMOUNT].

This positions [CLINIC_NAME] as the #1 preferred choice for [SPECIALTY] in [ZONE]. Shall I schedule a 15-minute screen share to walk you through the live dashboard?`,

    buyingSignals: ['schedule demo', 'send details', 'WhatsApp me', 'sounds interesting', 'how much', 'when can we start', 'ok send it', 'yes'],
    negativeSignals: ['not interested', 'remove from list', 'do not call', 'no thank you', 'busy'],
  },

  // ─── PRACTO PRIME — AI VARIANT ────────────────────────────────────────────
  PRIME_AI: {
    productName: 'Practo Prime AI',
    agentName: 'Aria',
    agentPersona: 'Senior Healthcare Solutions Consultant at Practo',
    openingPitch: `Hello, this is Aria from Practo Enterprise calling for [CLINIC_NAME] in [ZONE]. 

I'm reaching out about Practo Prime AI — our newest and most advanced patient conversion technology that uses artificial intelligence to pre-screen and confirm patient intent before connecting them to your clinic.

The result? You only receive calls and bookings from patients who are genuinely ready to visit — eliminating time-wasted phone queries entirely.

For a [SPECIALTY] clinic in [ZONE], our data shows Prime AI typically delivers 3x more converted patients versus standard appointment listing. Do you have 3 minutes to hear more?`,

    objectionHandlers: {
      'already_on_practo': `Prime AI is specifically designed as the next-generation upgrade for established Practo partners. The PFC (Per Fulfilled Connection) model means you pay only when a patient actually books and shows up — it's zero risk, pure performance.`,
      'not_interested': `I understand. Just one quick question — what's your current monthly target for new patient appointments? Prime AI is designed exactly for clinics that want to scale without scaling their front desk chaos.`,
      'cost_concern': `Prime AI operates purely on PFC billing — ₹[PFC_CHARGE] per unique fulfilled connection. There's no flat fee, no wasted budget. If patients don't book, you don't pay. It's the most risk-free patient acquisition model in Indian healthcare today.`,
      'need_to_think': `That's completely fair. I'll send you our Prime AI performance report for [SPECIALTY] clinics in [CITY] directly to WhatsApp. It has actual numbers from clinics like yours.`,
    },

    closingPitch: `For [CLINIC_NAME], Prime AI would operate at ₹[PFC_CHARGE] per fulfilled patient connection — with a subscription wallet of ₹[WALLET_AMOUNT] for [TERM] months.

This is purely performance-based. No risk, pure growth. Shall I initiate the Prime AI activation process for you?`,

    buyingSignals: ['ok', 'send me', 'interested', 'what next', 'how do i sign up', 'yes proceed', 'performance based sounds good'],
    negativeSignals: ['not interested', 'remove my number', 'busy'],
  },

  // ─── PRACTO REACH ─────────────────────────────────────────────────────────
  REACH: {
    productName: 'Practo Reach Spotlight',
    agentName: 'Aria',
    agentPersona: 'Senior Healthcare Solutions Consultant at Practo',
    openingPitch: `Hello, is this [CLINIC_NAME] in [ZONE], [CITY]? 

This is Aria from Practo Enterprise. I'm calling with some exciting news — we currently have premium Spotlight slots available for [SPECIALTY] in [ZONE] on Practo's search engine. These are the top-of-page, high-visibility positions that appear before all other clinics when patients search for [SPECIALTY] in your area.

We have only [SLOTS_AVAILABLE] slots remaining for [ZONE], and based on the search volume data for your locality — over [MONTHLY_SEARCHES] patient searches per month — this could be a significant patient acquisition opportunity for your clinic.

May I quickly walk you through what's available?`,

    objectionHandlers: {
      'not_on_practo': `That's perfectly fine — Reach Spotlight is open to all clinics, whether or not they currently use Practo for appointments. Your clinic will appear prominently across Practo's 20 million monthly active patients searching for healthcare in your area. No existing account needed.`,
      'already_visible': `That's great! However, being listed and being in the Spotlight are very different positions. Spotlight guarantees your clinic appears in the top [POSITION] positions for [SPECIALTY] in [ZONE] — above all non-Spotlight clinics, every time. It's the premium tier.`,
      'cost_concern': `The Reach Spotlight is priced at ₹[PRICE_PER_SLOT] per month per slot — this is for [DURATION] months. For a [SPECIALTY] clinic in [ZONE] with [MONTHLY_SEARCHES] monthly searches, you're looking at a patient acquisition cost far below any other digital channel. Most clinics recover the investment from 2-3 additional patients per month.`,
      'competition': `In [ZONE] right now, [COMPETING_CLINICS] count clinics are already running Reach Spotlight for [SPECIALTY]. Every day you're not in the Spotlight, those clinics are capturing patients who might have chosen you. I want to help you claim your position first.`,
      'need_to_think': `Absolutely. I'll send you the current slot availability report for [ZONE] | [SPECIALTY] on WhatsApp right now. Just be aware — the [POSITION] slot is being held for only 48 hours given current demand.`,
      'slots_available': `We currently have [SLOTS_AVAILABLE] of [TOTAL_SLOTS] slots remaining for [ZONE] | [SPECIALTY] | [POSITION]. Once these are taken, the next availability will be after [RENEWAL_DATE]. I'd recommend we secure your slot today.`,
    },

    closingPitch: `For [CLINIC_NAME], I'm proposing:
    
📍 City: [CITY] | Zone: [ZONE] | Specialty: [SPECIALTY]
🎯 Position: [POSITION] | Duration: [DURATION] months
💰 Investment: ₹[TOTAL_PRICE] total

This secures your clinic as the #1 discovery choice for [SPECIALTY] patients in [ZONE] for the full [DURATION]-month period. Shall I generate the commercial proposal right now and send it to your WhatsApp?`,

    buyingSignals: ['yes', 'ok', 'interested', 'send proposal', 'confirm', 'proceed', 'sounds good', 'when can we start', 'book the slot'],
    negativeSignals: ['not interested', 'remove number', 'no budget', 'call later'],
  },
};

// ─── AI PITCH GENERATOR ────────────────────────────────────────────────────
export function generateAiPitch(product, clinicData, proposalData = {}) {
  const { name: clinicName, specialty, city, zone, patientVolumeMonthly } = clinicData;
  const searchEst = patientVolumeMonthly ? Math.round(patientVolumeMonthly * 1.4) : 1200;

  const replacements = {
    '[CLINIC_NAME]': clinicName || 'your clinic',
    '[SPECIALTY]': specialty?.split('&')[0]?.trim() || 'your specialty',
    '[CITY]': city || 'your city',
    '[ZONE]': zone || 'your area',
    '[MONTHLY_SEARCH_ESTIMATE]': searchEst.toLocaleString('en-IN'),
    '[MONTHLY_SEARCHES]': searchEst.toLocaleString('en-IN'),
    '[TERM]': proposalData.term || '6',
    '[CALL_CHARGE]': proposalData.callCharge || '250',
    '[BOOK_CHARGE]': proposalData.bookCharge || '300',
    '[WALLET_AMOUNT]': proposalData.walletAmount ? Number(proposalData.walletAmount).toLocaleString('en-IN') : '50,000',
    '[PFC_CHARGE]': proposalData.pfcCharge || '350',
    '[PRICE_PER_SLOT]': proposalData.pricePerSlot || '12,000',
    '[TOTAL_PRICE]': proposalData.totalPrice ? Number(proposalData.totalPrice).toLocaleString('en-IN') : '72,000',
    '[DURATION]': proposalData.duration || '6',
    '[POSITION]': proposalData.position || 'Position 1',
    '[SLOTS_AVAILABLE]': proposalData.slotsAvailable || '3',
    '[TOTAL_SLOTS]': proposalData.totalSlots || '10',
    '[FOLLOWUP_TIME]': 'tomorrow at the same time',
    '[RENEWAL_DATE]': 'next quarter',
  };

  let script;
  if (product === 'PRIME_SUPREME') script = PRODUCT_SCRIPTS.PRIME_SUPREME;
  else if (product === 'PRIME_AI') script = PRODUCT_SCRIPTS.PRIME_AI;
  else script = PRODUCT_SCRIPTS.REACH;

  const applyReplacements = (text) =>
    Object.entries(replacements).reduce((str, [key, val]) => str.replaceAll(key, val), text);

  return {
    openingPitch: applyReplacements(script.openingPitch),
    closingPitch: applyReplacements(script.closingPitch),
    objectionHandlers: Object.fromEntries(
      Object.entries(script.objectionHandlers).map(([k, v]) => [k, applyReplacements(v)])
    ),
    buyingSignals: script.buyingSignals,
    negativeSignals: script.negativeSignals,
    productName: script.productName,
    agentName: script.agentName,
  };
}

// ─── DEAL SCORE CALCULATOR ────────────────────────────────────────────────
export function calculateDealScore({ hasPrime, hasReach, duration, discountPct, totalValue }) {
  let score = 50;
  if (duration >= 12) score += 30;
  else if (duration >= 6) score += 15;
  else score -= 10;
  if (hasPrime) score += 20;
  if (hasReach) score += 10;
  if (discountPct <= 5) score += 10;
  else if (discountPct > 15) score -= 15;
  if (totalValue >= 100000) score += 10;
  return Math.max(0, Math.min(100, score));
}

// ─── WHATSAPP TEMPLATE ────────────────────────────────────────────────────
export const WA_PROPOSAL_TEMPLATE = `*Practo Official Commercial Proposal*

Dear Doctor,

Following our conversation, here is the custom proposal for *[CLINIC_NAME]*:

*Services Included:*
[ITEMS]

*Final Investment:* ₹[NET_AMOUNT]

This proposal is valid for *15 days* from the date of issue.

To confirm, reply *YES* or call us directly.

Best Regards,
[SENDER_NAME]
Practo Enterprise Sales Team`;

// ─── EMAIL TEMPLATE ───────────────────────────────────────────────────────
export const EMAIL_PROPOSAL_TEMPLATE = `Dear Doctor,

Thank you for taking the time to explore Practo's digital solutions for [CLINIC_NAME].

As discussed, here is a summary of the customised proposal:

Services:
[ITEMS]

Net Payable Amount: ₹[NET_AMOUNT]

This proposal is valid for 15 days. Please review and reply to this email if you have any queries.

Looking forward to partnering with [CLINIC_NAME].

Best Regards,
[SENDER_NAME]
Practo Enterprise Team`;

// ─── DEFAULT TERMS & CONDITIONS ───────────────────────────────────────────
export const DEFAULT_TNC = [
  'This commercial proposal is valid for 15 days from the date of issue.',
  'Services will be activated post realization of 100% advance payment.',
  'All reach visibility and digital assets are subject to Practo\'s standard content guidelines and approval processes.',
  'TDS (Tax Deducted at Source) must be deducted and deposited by the client as per applicable Income Tax slabs.',
  'Final agreements are governed strictly by Practo\'s Terms of Service available on the official website.',
];

// ─── PRODUCT SCOPE TEXTS ─────────────────────────────────────────────────
export const SCOPE_TEXTS = {
  prime: `A premium technology product that delivers an exceptional patient experience. It guarantees assured appointments, minimal in-clinic wait times, 24x7 instant online booking, and a dedicated Prime visibility badge to elevate your clinic's premium reputation across the Practo network.`,
  reach: `A targeted digital visibility solution that secures top-tier placement for your clinic on Practo's highly trafficked search engine. By hyper-targeting specific specialities and local zones, it maximizes patient discovery, engagement, and direct footfall.`,
  video: `A complimentary on-site professional video and photo shoot designed to showcase your clinic's infrastructure and doctor profiles, instantly building patient trust and enhancing your digital presence.`,
};

// ─── COMPANY DETAILS (SELLER) ─────────────────────────────────────────────
export const PRACTO_COMPANY = {
  name: 'Practo Technologies Pvt. Ltd.',
  tan: 'BLRN05947E',
  cin: 'U72900KA2008PTC046374',
  pan: 'AACCN8042Q',
  gstin: '29AAICC3651Q1Z0',
  address: 'First Floor, No.275 13th Cross Road, 19th Main Road, HSR Layout 4th Sector, Bengaluru Urban, Karnataka - 560102',
};

export const PRACTO_BANK = {
  beneficiary: 'Practo Technologies Pvt. Ltd.',
  bank: 'HDFC, JP Nagar, Bangalore',
  accNo: '01332320001144',
  ifsc: 'HDFC0000133',
  accType: 'Current',
};
