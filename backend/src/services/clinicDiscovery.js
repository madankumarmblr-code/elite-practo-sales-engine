import { nanoid } from 'nanoid';
import {
  getLocationsMeta,
  listKeywordsFor,
  resolveDiscoveryTargets,
} from './locations.js';
import {
  expandSearchAreas,
  getZoneLocalityMeta,
  listLocalities,
} from './zoneLocalities.js';
import { dedupeLeads, liveDiscoverAreas, filterAuthenticLeads, isAuthenticLead, prioritizeLiveAreas } from './liveDiscovery.js';
import { applySmartChannelToDiscoveryLead } from './aiAssist.js';
import { specialtySlug, slugifyPracto } from './practoWeb.js';

export const PLATFORMS = [
  'Google Maps',
  'Google My Business',
  'Website',
  'Practo',
  'Justdial',
  'Lybrate',
  'OpenStreetMap',
  'Facebook',
  'Instagram',
  'ClinicSpots',
  'Sulekha',
  'Bing Places',
];

const FIRST = [
  'Ananya', 'Rahul', 'Priya', 'Vikram', 'Sneha', 'Arjun', 'Meera', 'Karan', 'Nisha', 'Omar',
  'Kavitha', 'Sanjay', 'Fatima', 'Rohan', 'Anita', 'Imran', 'Lakshmi', 'Deepak', 'Neha', 'Manish',
];
const LAST = [
  'Reddy', 'Mehta', 'Nair', 'Singh', 'Kapoor', 'Desai', 'Iyer', 'Malhotra', 'Verma', 'Farooq',
  'Rao', 'Pillai', 'Sheikh', 'Gupta', 'Bose', 'Ali', 'Krishnan', 'Jain', 'Joshi', 'Aggarwal',
];
const CLINIC_PREFIX = [
  'Smile', 'Care', 'Pearl', 'Apollo', 'Harmony', 'Bright', 'City', 'Prime', 'Lotus', 'Aura',
  'Summit', 'Green', 'Metro', 'Nova', 'Pulse', 'Orchid', 'Skyline', 'Heritage', 'Unity', 'Elite',
];
const STREETS = [
  'Main Road', 'Cross Road', '1st Block', '2nd Block', '3rd Cross', 'Ring Road',
  'Market Road', 'Station Road', 'Temple Street', 'MG Road', 'Service Road', 'Layout Road',
];
const KEYWORD_SUFFIX = {
  'General Dentistry': ['Dental Care', 'Dental Clinic', 'Tooth Clinic', 'Orthodontics', 'Smile Studio'],
  'General Dermatology': ['Skin Clinic', 'Derm Centre', 'Skin & Hair', 'Derma Studio'],
  'General Pediatrics': ['Kids Clinic', 'Child Care', 'Pediatrics', 'Little Care'],
  Orthopaedics: ['Ortho Centre', 'Bone & Joint', 'Ortho Clinic', 'Joint Care'],
  'General Gynecology': ['Womens Clinic', 'Maternity Care', 'Gyne Centre'],
  'General Ophthalmology': ['Eye Care', 'Eye Clinic', 'Vision Centre'],
  ENT: ['ENT Clinic', 'ENT Care', 'Sinus & ENT'],
  'General Physician': ['Family Clinic', 'Multi Speciality', 'Health Clinic', 'Polyclinic'],
  Physiotherapist: ['Physio Centre', 'Rehab Clinic', 'Physio Care'],
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pick(arr, seed) {
  return arr[(seed >>> 0) % arr.length];
}
function phoneFromSeed(seed) {
  const base = 9000000000 + ((seed >>> 0) % 899999999);
  const s = String(base);
  return `+91 ${s.slice(0, 5)} ${s.slice(5)}`;
}
function emailFromName(name, clinicSlug) {
  const local = name
    .toLowerCase()
    .replace(/^dr\.?\s*/i, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.');
  return `${local}@${clinicSlug}.in`;
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22) || 'clinic';
}
function citySlug(city) {
  const c = String(city || '').toLowerCase();
  if (c === 'bengaluru') return 'bangalore';
  return slugifyPracto(city) || 'bangalore';
}
function practoListingUrl(city, keyword, locality) {
  const parts = [citySlug(city), specialtySlug(keyword)];
  const loc = slugifyPracto(locality);
  if (loc) parts.push(loc);
  return `https://www.practo.com/${parts.join('/')}`;
}

function buildPlatforms(seed, hasPracto, clinicName, city, locality, keyword, website) {
  const q = encodeURIComponent(`${clinicName} ${locality} ${city}`);
  const keywordQ = encodeURIComponent(`${keyword} clinic ${locality} ${city}`);
  const gmb = `https://www.google.com/maps/search/${q}`;
  const all = [
    { name: 'Google Maps', listed: true, url: `https://www.google.com/maps/search/${q}` },
    { name: 'Google My Business', listed: true, url: gmb },
    {
      name: 'Website',
      listed: Boolean(website) || seed % 4 === 0,
      url: website || `https://www.google.com/search?q=${encodeURIComponent(clinicName + ' official website')}`,
    },
    {
      name: 'Practo',
      listed: hasPracto,
      url: hasPracto ? practoListingUrl(city, keyword, locality) : null,
    },
    {
      name: 'Justdial',
      listed: seed % 3 !== 0,
      url: `https://www.justdial.com/${encodeURIComponent(city)}/${keywordQ}`,
    },
    {
      name: 'Lybrate',
      listed: seed % 4 !== 1,
      url: `https://www.lybrate.com/search?q=${q}`,
    },
    {
      name: 'OpenStreetMap',
      listed: true,
      url: `https://www.openstreetmap.org/search?query=${q}`,
    },
    {
      name: 'Facebook',
      listed: seed % 5 !== 2,
      url: `https://www.facebook.com/search/top?q=${q}`,
    },
    {
      name: 'Instagram',
      listed: seed % 2 === 0,
      url: `https://www.instagram.com/explore/tags/${slugify(clinicName)}/`,
    },
    {
      name: 'ClinicSpots',
      listed: seed % 3 === 1,
      url: `https://www.clinicspots.com/search?q=${q}`,
    },
    {
      name: 'Sulekha',
      listed: seed % 4 === 0,
      url: `https://www.sulekha.com/search/?search=${q}`,
    },
    {
      name: 'Bing Places',
      listed: seed % 5 === 0 || seed % 5 === 3,
      url: `https://www.bing.com/maps?q=${q}`,
    },
  ];
  return all.filter((p) => p.listed);
}

function suffixForKeyword(keyword, seed) {
  const list = KEYWORD_SUFFIX[keyword] || [`${keyword} Clinic`, `${keyword} Centre`, `${keyword} Care`];
  return pick(list, seed);
}

function makeClinic({ city, zone, locality, zoneType, keyword, index }) {
  const area = locality || zone;
  const key = `${city}|${zone}|${area}|${keyword}|${index}`;
  const seed = hash(key);
  const prefix = pick(CLINIC_PREFIX, seed);
  const suffix = suffixForKeyword(keyword, seed >>> 3);
  const street = pick(STREETS, seed >>> 7);
  const door = 1 + (seed % 240);
  const clinicName = `${prefix} ${suffix}`;
  const clinicSlug = slugify(`${prefix}${suffix}${area}${index}`);

  const ownerFirst = pick(FIRST, seed >>> 2);
  const ownerLast = pick(LAST, seed >>> 4);
  const nonDoctor = /Veterinarian|Dietitian|Physiotherapist|Audiologist/i.test(keyword);
  const ownerIsDoctor = !nonDoctor && seed % 5 !== 0;
  const ownerName = ownerIsDoctor ? `Dr. ${ownerFirst} ${ownerLast}` : `${ownerFirst} ${ownerLast}`;

  const hasMarketing = seed % 3 !== 2;
  const mFirst = pick(FIRST, seed * 17 + index * 13);
  const mLast = pick(LAST, seed * 29 + index * 41);
  const hasPracto = seed % 5 !== 4;
  const rating = hasPracto ? (3.6 + ((seed % 14) / 10)).toFixed(1) : null;
  const website = seed % 4 === 0 ? `https://${clinicSlug}.in` : null;
  const address = `${door}, ${street}, ${area}, ${city}`;
  const ownerPhone = phoneFromSeed(seed);
  const platforms = buildPlatforms(seed, hasPracto, clinicName, city, area, keyword, website);
  const score =
    48 + platforms.length * 3 + (hasPracto ? 12 : 0) + (hasMarketing ? 6 : 0) + (website ? 5 : 0) + (seed % 8);

  return {
    id: `clinic-${hash(key).toString(36)}-${index}`,
    clinicName,
    specialty: keyword,
    keyword,
    city,
    zone,
    locality: area,
    zoneType,
    address,
    website,
    owner: {
      name: ownerName,
      phone: ownerPhone,
      email: emailFromName(ownerName, clinicSlug),
      whatsapp: ownerPhone,
      title: ownerIsDoctor ? 'Clinic Owner / Doctor' : 'Clinic Owner',
    },
    marketingHead: hasMarketing
      ? {
          name: `${mFirst} ${mLast}`,
          phone: phoneFromSeed(seed + 17),
          email: `marketing@${clinicSlug}.in`,
          title: 'Marketing Head',
        }
      : null,
    practo: {
      hasProfile: hasPracto,
      url: hasPracto ? practoListingUrl(city, keyword, locality) : null,
      rating: rating ? Number(rating) : null,
    },
    platforms,
    platformNames: platforms.map((p) => p.name),
    sourcesFoundOn: platforms.map((p) => p.name),
    score: Math.min(99, score),
    estimatedValue: 45000 + (seed % 20) * 12000 + (hasPracto ? 25000 : 0),
    suggestedChannel: !hasPracto ? 'whatsapp' : seed % 2 === 0 ? 'gmail' : 'calls',
    matchReason: `Zone locality expansion: ${city} · ${zone} → ${area} · ${keyword}`,
    discoverySource: 'sheet_locality',
    source: 'Sheet + locality reference',
    sheetMapped: true,
  };
}

function clinicCountForLocality(area, keyword) {
  const isSuper = /cityinventory/i.test(area.zone) || area.zoneType === 'SUPERZONE';
  const base = isSuper ? 6 : area.locality === area.zone ? 5 : 4;
  const jitter = hash(`${area.city}|${area.locality}|${keyword}`) % 3;
  return base + jitter;
}

export function getDiscoveryMeta() {
  const meta = getLocationsMeta();
  const localityMeta = getZoneLocalityMeta();
  return {
    ...meta,
    platforms: PLATFORMS,
    catalogSize: meta.comboCount,
    localitiesByCityZone: localityMeta.localitiesByCityZone,
    localityZoneCount: localityMeta.zoneCount,
    localityCount: localityMeta.localityCount,
    localitySource: localityMeta.sourceFile,
    filters: {
      practo: ['all', 'yes', 'no'],
      platforms: PLATFORMS,
      sources: ['all', 'live', 'practo_web', 'nominatim', 'overpass', 'google_places'],
      contact: ['all', 'phone', 'email', 'website'],
    },
  };
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '' || value === 'All') return [];
  return [value];
}

/**
 * Discover authentic clinics for City → Zone → Specialty.
 * Uses live Practo.com + OSM (+ Google Places when keyed). Synthetic sheet
 * inventory placeholders are not returned.
 */
export async function discoverClinics({
  city,
  zone,
  zones,
  specialty,
  keyword,
  keywords,
  localities,
  limit = null,
  live = true,
  allowSynthetic = false,
  maxLocalities = 40,
} = {}) {
  const kwList = asList(keywords).length ? asList(keywords) : asList(keyword || specialty);
  const zoneList = asList(zones).length ? asList(zones) : asList(zone);
  const localityList = asList(localities);

  const primaryKeyword = kwList[0] || 'clinic';
  const primaryZone = zoneList[0] || 'All';

  let sheetTargets = [];
  try {
    if (zoneList.length > 1 || kwList.length > 1) {
      for (const z of zoneList.length ? zoneList : ['All']) {
        for (const kw of kwList.length ? kwList : [primaryKeyword]) {
          sheetTargets.push(...resolveDiscoveryTargets({ city, zone: z, keyword: kw }));
        }
      }
      const seen = new Set();
      sheetTargets = sheetTargets.filter((t) => {
        const k = `${t.city}|${t.zone}|${t.keyword}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else {
      sheetTargets = resolveDiscoveryTargets({
        city,
        zone: primaryZone,
        keyword: primaryKeyword,
      });
    }
  } catch (err) {
    return { error: err.message || 'Discovery failed', results: [], count: 0 };
  }

  if (!sheetTargets.length) {
    return { error: 'No matching sheet targets', results: [], count: 0 };
  }

  /** Expand each sheet zone into localities from internal reference CSV */
  const areas = [];
  const areaSeen = new Set();
  for (const t of sheetTargets) {
    const expanded = expandSearchAreas({
      city: t.city,
      zone: t.zone,
      localities: localityList,
      maxLocalities,
    });
    for (const a of expanded) {
      const key = `${a.city}|${a.zone}|${a.locality}|${t.keyword}`;
      if (areaSeen.has(key)) continue;
      areaSeen.add(key);
      areas.push({ ...a, keyword: t.keyword });
    }
    if (!expanded.length) {
      areas.push({
        city: t.city,
        zone: t.zone,
        locality: t.zone,
        zoneType: t.zoneType,
        keyword: t.keyword,
      });
    }
  }

  const scannedSources = [
    { name: 'Practo.com', status: 'queued' },
    { name: 'OpenStreetMap', status: 'queued' },
    { name: 'Google Places', status: 'queued' },
  ];

  // Optional legacy synthetic inventory (off by default)
  const sheetLeads = [];
  const perLocality = {};
  if (allowSynthetic) {
    for (const area of areas) {
      const count = clinicCountForLocality(area, area.keyword);
      perLocality[area.locality] = (perLocality[area.locality] || 0) + count;
      for (let i = 0; i < count; i += 1) {
        sheetLeads.push(
          makeClinic({
            city: area.city,
            zone: area.zone,
            locality: area.locality,
            zoneType: area.zoneType,
            keyword: area.keyword,
            index: i,
          })
        );
      }
    }
  } else {
    for (const area of areas) {
      perLocality[area.locality] = perLocality[area.locality] || 0;
    }
  }

  const liveEnabled = live !== false && live !== '0';
  const onServerless = Boolean(process.env.VERCEL);
  const liveBudgetMs = onServerless ? 28000 : 50000;
  const maxLiveAreas = onServerless ? 4 : 10;
  const perArea = onServerless ? 10 : 12;

  let liveLeads = [];
  let liveScanned = [];
  let liveTimedOut = false;
  if (liveEnabled) {
    try {
      const liveAreas = prioritizeLiveAreas(areas, Math.min(maxLiveAreas, areas.length));
      // Fan out across distinct keywords when multi-select
      const byKeyword = new Map();
      for (const a of liveAreas) {
        const kw = a.keyword || primaryKeyword;
        if (!byKeyword.has(kw)) byKeyword.set(kw, []);
        byKeyword.get(kw).push(a);
      }
      for (const [kw, kwAreas] of byKeyword.entries()) {
        const liveResult = await liveDiscoverAreas({
          areas: kwAreas,
          keyword: kw,
          maxAreas: kwAreas.length,
          perArea,
          deadlineMs: liveBudgetMs,
        });
        liveLeads.push(...(liveResult.leads || []));
        liveScanned.push(...(liveResult.scannedSources || []));
        liveTimedOut = liveTimedOut || Boolean(liveResult.timedOut);
      }
      for (const s of liveScanned) {
        scannedSources.push(s);
      }
    } catch (err) {
      liveScanned = [{ name: 'Live discovery', status: 'error', detail: err.message }];
      scannedSources.push(...liveScanned);
    }
  }

  // Count live hits per locality for the UI (synthetic path already filled perLocality)
  if (!allowSynthetic) {
    for (const area of areas) {
      perLocality[area.locality] = perLocality[area.locality] || 0;
    }
    for (const lead of liveLeads) {
      const loc = lead.locality || lead.zone;
      if (!loc) continue;
      perLocality[loc] = (perLocality[loc] || 0) + 1;
    }
  }

  const combined = allowSynthetic ? [...liveLeads, ...sheetLeads] : liveLeads;
  const beforeDedupe = combined.length;
  const authentic = filterAuthenticLeads(combined);
  const rejectedSynthetic = beforeDedupe - authentic.length;
  let results = dedupeLeads(authentic).map(applySmartChannelToDiscoveryLead);
  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.clinicName.localeCompare(b.clinicName) ||
      String(a.locality || a.zone).localeCompare(String(b.locality || b.zone))
  );

  const totalBeforeLimit = results.length;
  const numericLimit = limit == null || limit === '' || Number(limit) <= 0 ? null : Number(limit);
  if (numericLimit) results = results.slice(0, numericLimit);

  const withPracto = results.filter((r) => r.practo?.hasProfile).length;
  const localitiesCovered = [...new Set(areas.map((a) => a.locality))];
  const zonesCovered = [...new Set(areas.map((a) => a.zone))];

  return {
    query: {
      city,
      zone: primaryZone,
      zones: zoneList.length ? zoneList : [primaryZone],
      localities: localityList,
      specialty: primaryKeyword,
      keyword: primaryKeyword,
      keywords: kwList.length ? kwList : [primaryKeyword],
      zonesScanned: zonesCovered,
      localitiesScanned: localitiesCovered,
      sheetCombos: sheetTargets.length,
      fullInventory: !numericLimit,
      liveEnabled,
      liveTimedOut,
      authenticOnly: !allowSynthetic,
    },
    scannedSources,
    availableKeywords: listKeywordsFor(city, primaryZone),
    availableLocalities:
      primaryZone && primaryZone !== 'All' ? listLocalities(city, primaryZone) : listLocalities(city, 'All'),
    summary: {
      total: results.length,
      totalAvailable: totalBeforeLimit,
      duplicatesRemoved: Math.max(0, authentic.length - totalBeforeLimit),
      syntheticRejected: rejectedSynthetic,
      zonesCovered: zonesCovered.length,
      localitiesCovered: localitiesCovered.length,
      perLocality,
      withPractoProfile: withPracto,
      withoutPractoProfile: results.length - withPracto,
      liveLeads: liveLeads.length,
      sheetLocalityLeads: allowSynthetic ? sheetLeads.length : 0,
      liveTimedOut,
      platformsCovered: PLATFORMS.length,
      source: liveEnabled ? 'practo.com+osm+places' : 'none',
      authenticOnly: !allowSynthetic,
    },
    count: results.length,
    results: results.map((r) => ({
      ...r,
      name: r.owner?.name || r.name,
      email: r.owner?.email || r.email || '',
      phone: r.owner?.phone || r.phone || '',
      company: r.clinicName || r.company,
      title: r.owner?.title || r.title || 'Clinic Owner',
      platformNames: r.platformNames || r.platforms?.map((p) => p.name) || [],
      source: r.source || 'Live discovery',
      location: `${r.locality || r.zone}, ${r.city}`,
      importKey: r.id || nanoid(8),
      authentic: isAuthenticLead(r),
    })),
  };
}
