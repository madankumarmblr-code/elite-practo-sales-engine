/**
 * Practo product catalog for the lead → WhatsApp → proposal conversion engine.
 * Only these three primary products are selectable via product_id.
 */

export const PRODUCT_IDS = Object.freeze({
  PRACTO_RAY: 'PRACTO_RAY',
  PRACTO_PRIME: 'PRACTO_PRIME',
  PRACTO_REACH: 'PRACTO_REACH',
});

export const PRODUCTS = Object.freeze({
  PRACTO_RAY: {
    id: 'PRACTO_RAY',
    label: 'Practo Ray',
    short: 'Ray',
    description:
      'Practice Management Software — EMR, billing, appointments, and clinic operations.',
    pitchFocus: [
      'Digital EMR & prescriptions',
      'Appointments & queue management',
      'Billing, GST invoices & receivables',
      'Multi-location clinic ops',
    ],
  },
  PRACTO_PRIME: {
    id: 'PRACTO_PRIME',
    label: 'Practo Prime',
    short: 'Prime',
    description:
      'Patient reach with 24×7 instant booking, verified listing, and premium clinic badge.',
    pitchFocus: [
      'Assured appointment slots',
      '24×7 instant booking',
      'Verified / premium listing badge',
      'Lower no-shows & wait times',
    ],
  },
  PRACTO_REACH: {
    id: 'PRACTO_REACH',
    label: 'Practo Reach',
    short: 'Reach',
    description:
      'Targeted advertising and high-visibility directory listings by city, zone, and speciality.',
    pitchFocus: [
      'Top-slot Practo search visibility',
      'City / zone / speciality targeting',
      'Patient discovery & footfall',
      'Campaign-ready inventory',
    ],
  },
});

/** Forbidden legacy / multi-tier package names — never expose in proposals or API responses. */
export const FORBIDDEN_PACKAGE_TIERS = Object.freeze([
  'basic',
  'standard',
  'gold',
  'silver',
  'bronze',
  'enterprise',
  'starter',
  'pro',
  'premium tier',
  'growth',
  'lite',
]);

export const COMMERCIAL_SUITE_NAME = 'Commercial Proposal Suite';

export function normalizeProductId(raw) {
  const value = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (PRODUCTS[value]) return value;
  const aliases = {
    RAY: 'PRACTO_RAY',
    PRIME: 'PRACTO_PRIME',
    REACH: 'PRACTO_REACH',
    PRACTO_RAY: 'PRACTO_RAY',
    PRACTO_PRIME: 'PRACTO_PRIME',
    PRACTO_REACH: 'PRACTO_REACH',
  };
  return aliases[value] || null;
}

export function getProduct(productId) {
  const id = normalizeProductId(productId);
  return id ? PRODUCTS[id] : null;
}

export function assertContextFields({ city_location, speciality }) {
  const city = String(city_location || '').trim();
  const specialty = String(speciality || '').trim();
  if (!city) {
    const err = new Error('city_location is required and must be preserved across the pipeline');
    err.status = 400;
    throw err;
  }
  if (!specialty) {
    const err = new Error('speciality is required and must be preserved across the pipeline');
    err.status = 400;
    throw err;
  }
  return { city_location: city, speciality: specialty };
}
