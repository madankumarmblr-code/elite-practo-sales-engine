/**
 * Commercial Proposal Suite generator.
 *
 * STRICT RULE: Never expose multi-tier packages (Basic / Standard / Gold / Enterprise).
 * Only the unified "Commercial Proposal Suite" is returned, tailored to
 * product_id + city_location + speciality.
 */
import {
  COMMERCIAL_SUITE_NAME,
  FORBIDDEN_PACKAGE_TIERS,
  assertContextFields,
  getProduct,
  normalizeProductId,
} from './products.js';

function assertNoTierLeak(payload) {
  const blob = JSON.stringify(payload).toLowerCase();
  for (const tier of FORBIDDEN_PACKAGE_TIERS) {
    // Allow the word "enterprise" only inside pricing.suite_total copy ("Custom Enterprise Rate")
    if (tier === 'enterprise' && /custom enterprise rate/.test(blob)) continue;
    if (blob.includes(`"package_name":"${tier}"`) || blob.includes(`"tier":"${tier}"`)) {
      const err = new Error(`Forbidden package tier leaked into proposal: ${tier}`);
      err.status = 500;
      throw err;
    }
  }
  if (Array.isArray(payload?.proposal?.tiers) && payload.proposal.tiers.length) {
    const err = new Error('Multi-tier pricing is forbidden — Commercial Proposal Suite only');
    err.status = 500;
    throw err;
  }
  if (Array.isArray(payload?.alternatives) && payload.alternatives.length) {
    const err = new Error('Alternative package listings are forbidden');
    err.status = 500;
    throw err;
  }
  return payload;
}

/**
 * Build the sole allowed commercial offer for a conversion lead.
 * @param {object} lead
 */
export function generateCommercialProposalSuite(lead = {}) {
  const { city_location, speciality } = assertContextFields(lead);
  const productId = normalizeProductId(lead.product_id || lead.product_selected || lead.product);
  const product = getProduct(productId);
  if (!product) {
    const err = new Error(
      'product_id must be one of PRACTO_RAY | PRACTO_PRIME | PRACTO_REACH'
    );
    err.status = 400;
    throw err;
  }

  const doctor = String(lead.doctor_name || lead.name || '').trim();
  const clinic = String(lead.clinic_name || lead.company || '').trim();

  const included_features = [
    `Full Product Suite Access for ${product.id}`,
    `Dedicated Onboarding Specialist for ${city_location} Region`,
    `Speciality-Tailored Patient Reach Optimization (${speciality})`,
    '24/7 Priority Support & SLA',
    ...product.pitchFocus.map((f) => `${product.short}: ${f}`),
  ];

  const payload = {
    status: 'SUCCESS',
    lead_id: lead.lead_id || lead.external_lead_id || lead.id || null,
    doctor_name: doctor || null,
    clinic_name: clinic || null,
    city_location,
    speciality,
    product_selected: product.id,
    proposal: {
      package_name: COMMERCIAL_SUITE_NAME,
      description: `Comprehensive conversion and onboarding package tailored for ${speciality} practices in ${city_location} — ${product.label} only.`,
      included_features,
      pricing: {
        currency: 'INR',
        suite_total: 'Custom Enterprise Rate',
        billing_cycle: 'Annual',
      },
      // Explicitly no tiers / alternatives
      tiers: [],
      alternatives: [],
    },
  };

  return assertNoTierLeak(payload);
}

export default { generateCommercialProposalSuite };
