/**
 * Fetch clinic / doctor details from the public Practo website
 * (https://www.practo.com) via listing + profile JSON-LD — no partner API key.
 */
const UA =
  'Mozilla/5.0 (compatible; PractoSalesAutomation/1.0; +https://www.practo.com)';
const BASE = 'https://www.practo.com';

const SPECIALTY_ALIASES = [
  [/dentist|dental|orthodont|oral/i, 'dentist'],
  [/gynae|gyne|obstetric|ob.?gyn/i, 'gynecologist-obstetrician'],
  [/dermat|skin|cosmo/i, 'dermatologist'],
  [/pediatric|paediatric|child/i, 'pediatrician'],
  [/ortho(?!dont)/i, 'orthopedist'],
  [/cardio|heart/i, 'cardiologist'],
  [/neuro/i, 'neurologist'],
  [/ent|otolaryng/i, 'ear-nose-throat-ent-specialist'],
  [/ophthal|eye|vision/i, 'ophthalmologist'],
  [/psychiatr/i, 'psychiatrist'],
  [/urolog/i, 'urologist'],
  [/gastro/i, 'gastroenterologist'],
  [/physiother/i, 'physiotherapist'],
  [/general.?phys|physician|gp|family.?med/i, 'general-physician'],
  [/multi.?special|clinic|hospital|doctor/i, 'general-physician'],
];

export function slugifyPracto(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function specialtySlug(keyword) {
  const raw = String(keyword || '').trim();
  if (!raw) return 'general-physician';
  for (const [re, slug] of SPECIALTY_ALIASES) {
    if (re.test(raw)) return slug;
  }
  return slugifyPracto(raw) || 'general-physician';
}

function citySlug(city) {
  const c = String(city || '').trim().toLowerCase();
  if (c === 'bengaluru') return 'bangalore';
  return slugifyPracto(city) || 'bangalore';
}

async function fetchHtml(url, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, url: res.url || url, html: text };
  } finally {
    clearTimeout(timer);
  }
}

function parseLdJsonBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === 'object') out.push(parsed);
    } catch {
      /* ignore bad blocks */
    }
  }
  return out;
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(dr|clinic|hospital|centre|center|care|dental|the|pvt|ltd|llp|multispeciality|multi-speciality)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
}

function ratingFromEntity(entity) {
  const agg = entity?.aggregateRating;
  if (!agg) return null;
  const n = Number(agg.ratingValue);
  return Number.isFinite(n) ? n : null;
}

function reviewCountFromEntity(entity) {
  const agg = entity?.aggregateRating;
  if (!agg) return null;
  const n = Number(agg.reviewCount || agg.ratingCount);
  return Number.isFinite(n) ? n : null;
}

function addressLine(addr) {
  if (!addr || typeof addr !== 'object') return '';
  return [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode]
    .filter(Boolean)
    .join(', ');
}

/**
 * Convert a listing JSON-LD Dentist/Physician/MedicalClinic node into a discovery lead.
 */
export function listingToLead(entity, { city, zone, locality, keyword } = {}) {
  if (!entity || typeof entity !== 'object') return null;
  const branch = entity.branchOf && typeof entity.branchOf === 'object' ? entity.branchOf : null;
  const clinicName =
    branch?.name ||
    (String(entity['@type'] || '').toLowerCase().includes('clinic') ? entity.name : null) ||
    entity.name;
  if (!clinicName) return null;

  const doctorName =
    /doctor|dentist|physician|surgeon/i.test(String(entity['@type'] || '')) ||
    /^dr\b/i.test(String(entity.name || ''))
      ? entity.name
      : branch
        ? entity.name
        : null;

  const practoUrl = cleanPractoUrl(branch?.url || entity.url);
  const addr = entity.address || branch?.address || {};
  const area = addr.addressLocality || locality || zone || '';
  const phone = entity.telephone || branch?.telephone || '';
  const rating = ratingFromEntity(entity) || ratingFromEntity(branch);
  const reviews = reviewCountFromEntity(entity) || reviewCountFromEntity(branch);
  const lat = entity.geo?.latitude != null ? Number(entity.geo.latitude) : null;
  const lon = entity.geo?.longitude != null ? Number(entity.geo.longitude) : null;

  const platforms = [
    {
      name: 'Practo',
      listed: true,
      url: practoUrl,
    },
    {
      name: 'Google Maps',
      listed: true,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${clinicName} ${area} ${city || ''}`
      )}`,
    },
  ];

  return {
    id: `practo-web-${normalizeName(clinicName)}-${normalizeName(area)}-${normalizeName(doctorName || '')}`.slice(
      0,
      72
    ),
    clinicName,
    specialty: keyword || entity.medicalSpecialty || entity['@type'] || '',
    keyword: keyword || '',
    city: city || addr.addressRegion || '',
    zone: zone || area,
    locality: area,
    address: addressLine(addr) || `${area}, ${city || ''}`.trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    owner: {
      name: doctorName || 'Clinic contact',
      phone: String(phone || ''),
      email: '',
      title: doctorName ? 'Doctor' : 'Clinic contact',
    },
    marketingHead: null,
    practo: {
      hasProfile: true,
      url: practoUrl,
      rating,
      reviews,
      source: 'practo.com',
    },
    platforms,
    website: null,
    score: 78 + (rating ? Math.round(rating * 2) : 0) + (phone ? 6 : 0),
    estimatedValue: 70000 + (rating ? Math.round(rating * 4000) : 0),
    suggestedChannel: phone ? 'whatsapp' : 'gmail',
    matchReason: `Practo.com · ${city || ''} · ${area} · ${keyword || ''}`.trim(),
    source: 'Practo.com',
    discoverySource: 'practo_web',
    sheetMapped: true,
    fee: entity.priceRange ?? null,
  };
}

function cleanPractoUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url), BASE);
    if (!u.hostname.includes('practo.com')) return String(url).split('?')[0];
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '') || u.toString();
  } catch {
    return String(url).split('?')[0];
  }
}

export function buildListingUrls({ city, locality, keyword, pages = 1, includeCityFallback = true }) {
  const c = citySlug(city);
  const s = specialtySlug(keyword);
  const loc = slugifyPracto(locality);
  const bases = [];
  if (loc) bases.push(`${BASE}/${c}/${s}/${loc}`);
  else bases.push(`${BASE}/${c}/${s}`);
  if (loc && includeCityFallback) bases.push(`${BASE}/${c}/${s}`);
  const urls = [];
  const pageCount = Math.max(1, Math.min(5, Number(pages) || 1));
  for (const base of bases) {
    // Paginate primary (first) base fully; city fallback only page 1 to avoid dupes
    const maxP = bases.indexOf(base) === 0 ? pageCount : 1;
    for (let p = 1; p <= maxP; p += 1) {
      urls.push(p === 1 ? base : `${base}?page=${p}`);
    }
  }
  return [...new Set(urls)];
}

/**
 * Pull clinic profile links embedded in Practo listing HTML (beyond JSON-LD).
 */
function leadsFromListingHtml(html, { city, zone, locality, keyword } = {}) {
  const leads = [];
  const seen = new Set();
  const re = /https?:\/\/www\.practo\.com\/[^"'\\\s]+\/(?:[Cc]linic)\/([a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1];
    const path = m[0].replace(/\\u002F/g, '/');
    const practoUrl = cleanPractoUrl(path);
    if (!practoUrl || seen.has(practoUrl)) continue;
    seen.add(practoUrl);
    const clinicName = slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
      .replace(/\s+\d+\s*$/, '')
      .trim();
    if (clinicName.length < 3) continue;
    leads.push({
      id: `practo-web-href-${normalizeName(clinicName)}-${normalizeName(locality || zone || '')}`.slice(0, 72),
      clinicName,
      specialty: keyword || '',
      keyword: keyword || '',
      city: city || '',
      zone: zone || locality || '',
      locality: locality || zone || '',
      address: `${locality || zone || ''}, ${city || ''}`.replace(/^,\s*|,\s*$/g, ''),
      lat: null,
      lon: null,
      owner: { name: 'Clinic contact', phone: '', email: '', title: 'Clinic contact' },
      marketingHead: null,
      practo: { hasProfile: true, url: practoUrl, rating: null, reviews: null, source: 'practo.com' },
      platforms: [
        { name: 'Practo', listed: true, url: practoUrl },
        {
          name: 'Google Maps',
          listed: true,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${clinicName} ${locality || ''} ${city || ''}`
          )}`,
        },
      ],
      website: null,
      score: 72,
      estimatedValue: 65000,
      suggestedChannel: 'calls',
      matchReason: `Practo.com listing · ${city || ''} · ${locality || zone || ''} · ${keyword || ''}`.trim(),
      source: 'Practo.com',
      discoverySource: 'practo_web',
      sheetMapped: true,
    });
  }
  return leads;
}

/**
 * Search Practo.com listing pages for a city / locality / specialty.
 * Merges JSON-LD entities + clinic hrefs across multiple listing pages.
 */
export async function searchPractoWeb({
  city,
  zone,
  locality,
  keyword,
  limit = 12,
  pages = 2,
  includeCityFallback = true,
} = {}) {
  const area = locality || zone || '';
  const pageBudget = limit > 20 ? Math.max(2, Math.min(5, pages)) : Math.max(1, Math.min(3, pages));
  const urls = buildListingUrls({
    city,
    locality: area,
    keyword,
    pages: pageBudget,
    includeCityFallback: includeCityFallback !== false && !area,
  });
  const leads = [];
  const seen = new Set();
  let lastStatus = null;
  let usedUrl = null;

  const pushLead = (lead) => {
    if (!lead) return;
    const key =
      (lead.practo?.url || '') +
      '|' +
      normalizeName(lead.clinicName) +
      '|' +
      normalizeName(lead.locality);
    if (seen.has(key)) return;
    seen.add(key);
    leads.push(lead);
  };

  const pageTimeoutMs = process.env.VERCEL ? 8000 : 12000;
  const pending = urls.slice(0, Math.min(urls.length, Math.max(pageBudget, 2)));
  const pagesHtml = await Promise.all(
    pending.map((url) => fetchHtml(url, { timeoutMs: pageTimeoutMs }))
  );
  for (let i = 0; i < pagesHtml.length; i += 1) {
    if (leads.length >= limit) break;
    const page = pagesHtml[i];
    lastStatus = page.status;
    if (!page.ok) continue;
    usedUrl = page.url || pending[i];

    const entities = parseLdJsonBlocks(page.html).filter((e) => {
      const t = String(e['@type'] || '');
      return /Dentist|Physician|MedicalClinic|Hospital|Doctor|Surgeon|Clinic|Dermatologist/i.test(t);
    });
    for (const entity of entities) {
      pushLead(listingToLead(entity, { city, zone, locality: area, keyword }));
      if (leads.length >= limit) break;
    }
    for (const lead of leadsFromListingHtml(page.html, { city, zone, locality: area, keyword })) {
      pushLead(lead);
      if (leads.length >= limit) break;
    }
  }

  return {
    ok: leads.length > 0 || lastStatus === 200,
    status: lastStatus,
    url: usedUrl || urls[0],
    count: leads.length,
    results: leads.slice(0, limit),
  };
}

/**
 * Connectivity probe used by API Integrations "Test".
 */
export async function probePractoWeb(config = {}) {
  const city = config.city || config.defaultCity || 'Bangalore';
  const keyword = config.specialty || config.keyword || 'dentist';
  const locality = config.locality || '';
  const result = await searchPractoWeb({ city, locality, keyword, limit: 3 });
  if (result.count > 0) {
    return {
      ok: true,
      status: 'connected',
      message: `Practo.com reachable — ${result.count} listing(s) for ${keyword} in ${city}`,
      httpStatus: result.status,
      detail: { url: result.url, sample: result.results[0]?.clinicName },
    };
  }
  if (result.status && result.status < 500) {
    return {
      ok: true,
      status: 'connected',
      message: `Practo.com reachable (HTTP ${result.status}) — no listings parsed for sample query`,
      httpStatus: result.status,
      detail: { url: result.url },
    };
  }
  return {
    ok: false,
    status: 'error',
    message: `Practo.com probe failed${result.status ? ` (HTTP ${result.status})` : ''}`,
    httpStatus: result.status,
  };
}

/**
 * Attach Practo.com profile match onto existing discovery leads (by clinic name).
 */
export async function enrichLeadsWithPractoWeb(leads, { city, keyword, deadlineMs } = {}) {
  if (!Array.isArray(leads) || !leads.length) return { leads, scanned: [] };
  const started = Date.now();
  const pastDeadline = () => deadlineMs && Date.now() - started > deadlineMs;
  const byLocality = new Map();
  for (const lead of leads) {
    const loc = lead.locality || lead.zone || '';
    if (!byLocality.has(loc)) byLocality.set(loc, []);
    byLocality.get(loc).push(lead);
  }

  const scanned = [];
  const indexByLocality = new Map();

  for (const [loc, group] of byLocality.entries()) {
    if (pastDeadline()) {
      scanned.push({
        name: 'Practo.com enrich',
        status: 'timeout',
        detail: 'Stopped early to keep search responsive',
      });
      break;
    }
    try {
      const kw = keyword || group[0]?.keyword || group[0]?.specialty || 'clinic';
      const found = await searchPractoWeb({
        city: city || group[0]?.city,
        locality: loc,
        keyword: kw,
        limit: 20,
      });
      const map = new Map();
      for (const row of found.results) {
        map.set(normalizeName(row.clinicName), row);
      }
      indexByLocality.set(loc, map);
      scanned.push({
        name: `Practo.com · ${loc || city || 'city'}`,
        status: 'scanned',
        count: found.count,
      });
    } catch (err) {
      scanned.push({
        name: `Practo.com · ${loc || city || 'city'}`,
        status: 'error',
        detail: err.message,
      });
    }
  }

  const out = leads.map((lead) => {
    if (lead.practo?.hasProfile && lead.practo?.source === 'practo.com') return lead;
    const loc = lead.locality || lead.zone || '';
    const map = indexByLocality.get(loc) || indexByLocality.get('') || null;
    if (!map) return lead;
    const hit =
      map.get(normalizeName(lead.clinicName || lead.company)) ||
      map.get(normalizeName(lead.company || lead.clinicName));
    if (!hit) return lead;
    const platforms = Array.isArray(lead.platforms) ? [...lead.platforms] : [];
    if (!platforms.some((p) => p.name === 'Practo')) {
      platforms.unshift({ name: 'Practo', listed: true, url: hit.practo.url });
    }
    return {
      ...lead,
      practo: hit.practo,
      platforms,
      score: Math.max(Number(lead.score) || 0, Number(hit.score) || 0),
      suggestedChannel: lead.practo?.hasProfile
        ? lead.suggestedChannel
        : hit.suggestedChannel || lead.suggestedChannel,
      matchReason: `${lead.matchReason || lead.source || 'Discovery'} + Practo.com`,
    };
  });

  return { leads: out, scanned };
}

