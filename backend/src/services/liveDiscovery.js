/**
 * Live clinic discovery adapters (free + key-based).
 * Free: OpenStreetMap Nominatim + Overpass.
 * Key-based: Google Places when configured in api_integrations.
 */
import db from '../db/db.js';
import { searchPractoWeb, enrichLeadsWithPractoWeb } from './practoWeb.js';

const USER_AGENT = 'PractoSalesAutomation/1.0 (clinic-lead-discovery; contact=superadmin@practo.sales)';

function getIntegrationSecrets(provider) {
  try {
    const row = db.prepare('SELECT * FROM api_integrations WHERE provider = ?').get(provider);
    if (!row || !row.enabled) return null;
    const secrets = JSON.parse(row.secrets || '{}');
    const config = JSON.parse(row.config || '{}');
    if (!Object.values(secrets).some(Boolean)) return { secrets, config, enabled: true, hasKey: false };
    return { secrets, config, enabled: true, hasKey: true };
  } catch {
    return null;
  }
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || '';
}

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(dr|clinic|hospital|centre|center|care|dental|the|pvt|ltd|llp)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
}

function richness(lead) {
  const phone = normalizePhone(lead.phone || lead.owner?.phone);
  const email = String(lead.email || lead.owner?.email || '').trim();
  const website = lead.website ? 1 : 0;
  const placeId = lead.placeId ? 2 : 0;
  const score = Number(lead.score) || 0;
  return (phone ? 8 : 0) + (email ? 4 : 0) + website * 3 + placeId + Math.min(10, Math.floor(score / 10));
}

/** Stable identity keys for a lead — used to collapse cross-source duplicates. */
export function leadDedupeKeys(lead) {
  const keys = [];
  if (lead.placeId) keys.push(`place:${lead.placeId}`);
  const phone = normalizePhone(lead.phone || lead.owner?.phone);
  if (phone) keys.push(`p:${phone}`);
  const email = String(lead.email || lead.owner?.email || '')
    .trim()
    .toLowerCase();
  if (email && email.includes('@')) keys.push(`e:${email}`);
  const name = normalizeName(lead.clinicName || lead.company || lead.name);
  const city = String(lead.city || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const locality = String(lead.locality || lead.zone || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
  if (name && city && locality) keys.push(`nl:${name}|${city}|${locality}`);
  else if (name && city) keys.push(`n:${name}|${city}`);
  if (!keys.length) keys.push(`id:${lead.id || lead.importKey || Math.random()}`);
  return keys;
}

const AUTHENTIC_SOURCES = new Set(['nominatim', 'overpass', 'google_places', 'practo_web']);

/**
 * True only for live-sourced clinics (OSM / Google Places / Practo.com).
 * Rejects synthetic "sheet_locality" inventory placeholders.
 */
export function isAuthenticLead(lead) {
  if (!lead || typeof lead !== 'object') return false;
  const src = String(lead.discoverySource || '').trim();
  if (src === 'sheet_locality') return false;
  if (/sheet\s*\+\s*locality|synthetic|demo|sample/i.test(String(lead.source || ''))) return false;
  if (/zone locality expansion/i.test(String(lead.matchReason || ''))) return false;

  const name = String(lead.clinicName || lead.company || lead.name || '').trim();
  if (name.length < 3) return false;
  if (/^(clinic|hospital|doctor|unknown|listing contact)$/i.test(name)) return false;

  if (AUTHENTIC_SOURCES.has(src)) return true;

  // Fallback for imported rows that lost discoverySource but still have real signals
  const phone = normalizePhone(lead.phone || lead.owner?.phone);
  const email = String(lead.email || lead.owner?.email || '').trim();
  const practoUrl = String(lead.practo?.url || '');
  const hasPracto = Boolean(lead.practo?.hasProfile && /practo\.com/i.test(practoUrl));
  const hasPlace = Boolean(lead.placeId);
  const hasWebsite = Boolean(lead.website) && /^https?:\/\//i.test(String(lead.website));
  return Boolean(phone || hasPracto || hasPlace || (email.includes('@') && hasWebsite));
}

export function filterAuthenticLeads(leads) {
  if (!Array.isArray(leads)) return [];
  return leads.filter(isAuthenticLead);
}

/**
 * Collapse duplicates across OSM / Places / Practo.
 * Keeps the richest record when keys collide (phone, placeId, name+locality, Practo URL).
 */
export function dedupeLeads(leads) {
  const keyToIndex = new Map();
  const out = [];

  for (const lead of leads) {
    const keys = leadDedupeKeys(lead);
    // Practo profile URL is a strong identity
    const practoUrl = String(lead.practo?.url || '')
      .split('?')[0]
      .replace(/\/$/, '')
      .toLowerCase();
    if (practoUrl.includes('practo.com')) keys.push(`practo:${practoUrl}`);

    let hitIndex = -1;
    for (const key of keys) {
      if (keyToIndex.has(key)) {
        hitIndex = keyToIndex.get(key);
        break;
      }
    }
    if (hitIndex >= 0) {
      if (richness(lead) > richness(out[hitIndex])) {
        // Prefer authentic Practo profile data when merging
        const prev = out[hitIndex];
        out[hitIndex] = {
          ...prev,
          ...lead,
          practo: lead.practo?.hasProfile ? lead.practo : prev.practo,
          platforms: mergePlatforms(prev.platforms, lead.platforms),
          score: Math.max(Number(prev.score) || 0, Number(lead.score) || 0),
        };
      } else if (lead.practo?.hasProfile && !out[hitIndex].practo?.hasProfile) {
        out[hitIndex] = {
          ...out[hitIndex],
          practo: lead.practo,
          platforms: mergePlatforms(out[hitIndex].platforms, lead.platforms),
        };
      }
      for (const key of keys) keyToIndex.set(key, hitIndex);
      continue;
    }
    const idx = out.length;
    out.push(lead);
    for (const key of keys) keyToIndex.set(key, idx);
  }
  return out;
}

function mergePlatforms(a, b) {
  const list = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const name = p?.name || p;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(typeof p === 'string' ? { name: p, listed: true } : p);
  }
  return out;
}

async function fetchJson(url, { timeoutMs = 8000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Free Overpass query for clinics/hospitals/dentists near a named area.
 */
export async function searchOverpass({
  city,
  zone,
  locality,
  keyword,
  limit = 12,
  timeoutMs = 8000,
} = {}) {
  const amenity =
    /dentist|dental|orthodont/i.test(keyword)
      ? 'dentist|clinic|doctors|hospital'
      : /hospital|multi.?special/i.test(keyword)
        ? 'hospital|clinic|doctors'
        : 'clinic|doctors|hospital|dentist';

  const area = locality || zone;
  const areaName = `${area}, ${city}`;
  const geoUrl =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: `${areaName}, India`,
      format: 'jsonv2',
      limit: '1',
    });
  const geoBudget = Math.min(4000, Math.max(1500, Math.floor(timeoutMs * 0.4)));
  const geo = await fetchJson(geoUrl, { timeoutMs: geoBudget });
  if (!Array.isArray(geo) || !geo[0]) return [];
  const { lat, lon } = geo[0];
  const overpassTimeoutSec = Math.max(4, Math.min(12, Math.floor(timeoutMs / 1000)));
  const overpassQuery = `
    [out:json][timeout:${overpassTimeoutSec}];
    (
      node["amenity"~"${amenity}"](around:2500,${lat},${lon});
      way["amenity"~"${amenity}"](around:2500,${lat},${lon});
      node["healthcare"](around:2500,${lat},${lon});
    );
    out center tags ${limit};
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(overpassQuery)}`,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json();
  const elements = Array.isArray(data.elements) ? data.elements.slice(0, limit) : [];
  return elements
    .map((el, i) => {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || `${keyword} Clinic`;
      const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
      const website = tags.website || tags['contact:website'] || null;
      const email = tags.email || tags['contact:email'] || '';
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'] || area,
        city,
      ].filter(Boolean);
      const platforms = [
        { name: 'OpenStreetMap', listed: true, url: `https://www.openstreetmap.org/${el.type}/${el.id}` },
        {
          name: 'Google Maps',
          listed: true,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${area} ${city}`)}`,
        },
        {
          name: 'Google My Business',
          listed: true,
          url: `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${city}`)}`,
        },
      ];
      if (website) {
        platforms.push({ name: 'Website', listed: true, url: website });
      }
      return {
        id: `osm-ov-${el.type}-${el.id || i}`,
        clinicName: name,
        specialty: keyword,
        keyword,
        city,
        zone: zone || locality,
        locality: area,
        address: addressParts.join(', ') || `${area}, ${city}`,
        lat: el.lat || el.center?.lat || null,
        lon: el.lon || el.center?.lon || null,
        owner: {
          name: tags.operator || 'Clinic owner',
          phone,
          email,
          whatsapp: phone,
          title: 'Clinic Owner',
        },
        marketingHead: null,
        practo: { hasProfile: false, url: null, rating: null },
        platforms,
        website,
        score: 70 + (phone ? 8 : 0) + (website ? 6 : 0) + (email ? 4 : 0),
        estimatedValue: 65000 + (website ? 15000 : 0),
        suggestedChannel: phone ? 'whatsapp' : email ? 'gmail' : 'calls',
        matchReason: `OSM Overpass · ${city} · ${area} · ${keyword}`,
        source: 'OpenStreetMap Overpass (free)',
        discoverySource: 'overpass',
        sheetMapped: true,
      };
    })
    .filter((r) => r.clinicName && normalizeName(r.clinicName).length >= 3);
}

/**
 * Google Places Text Search + Place Details enrichment when API key is configured.
 */
export async function enrichPlaceDetails(placeId, apiKey) {
  if (!placeId || !apiKey) return null;
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json?' +
    new URLSearchParams({
      place_id: placeId,
      fields:
        'name,formatted_phone_number,international_phone_number,website,url,opening_hours,rating,user_ratings_total,formatted_address,business_status',
      key: apiKey,
    });
  const data = await fetchJson(url, { timeoutMs: 10000 });
  return data?.result || null;
}

export async function searchGooglePlaces({ city, zone, locality, keyword, limit = 12 }) {
  const integ = getIntegrationSecrets('google_maps');
  if (!integ?.hasKey) return [];
  const key = integ.secrets.apiKey;
  const area = locality || zone;
  const q = `${keyword} clinic in ${area}, ${city}`;
  const url =
    'https://maps.googleapis.com/maps/api/place/textsearch/json?' +
    new URLSearchParams({ query: q, key, region: 'in', language: 'en' });
  const data = await fetchJson(url, { timeoutMs: 10000 });
  const results = Array.isArray(data.results) ? data.results.slice(0, limit) : [];

  const enriched = [];
  for (const r of results) {
    let details = null;
    try {
      details = await enrichPlaceDetails(r.place_id, key);
    } catch {
      details = null;
    }
    const name = details?.name || r.name || `${keyword} Clinic`;
    const address = details?.formatted_address || r.formatted_address || `${area}, ${city}`;
    const phone =
      details?.international_phone_number || details?.formatted_phone_number || '';
    const website = details?.website || null;
    const hours = details?.opening_hours?.weekday_text || [];
    const rating = details?.rating || r.rating || null;
    const platforms = [
      {
        name: 'Google My Business',
        listed: true,
        url: details?.url || `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      },
      {
        name: 'Google Maps',
        listed: true,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`,
      },
    ];
    if (website) platforms.push({ name: 'Website', listed: true, url: website });

    enriched.push({
      id: `gplaces-${r.place_id || enriched.length}`,
      placeId: r.place_id || null,
      clinicName: name,
      specialty: keyword,
      keyword,
      city,
      zone: zone || locality,
      locality: area,
      address,
      openingHours: hours,
      businessStatus: details?.business_status || null,
      owner: {
        name: 'Listing contact',
        phone,
        email: '',
        whatsapp: phone,
        title: 'Clinic contact',
      },
      marketingHead: null,
      practo: { hasProfile: false, url: null, rating: rating ? Number(rating) : null },
      platforms,
      website,
      score:
        78 +
        Math.round((rating || 0) * 3) +
        (phone ? 6 : 0) +
        (website ? 5 : 0) +
        (r.user_ratings_total ? 4 : 0),
      estimatedValue: 85000 + (website ? 10000 : 0),
      suggestedChannel: phone ? 'whatsapp' : website ? 'gmail' : 'calls',
      matchReason: `Google Places + GMB details · ${city} · ${area} · ${keyword}`,
      source: 'Google Places / GMB',
      discoverySource: 'google_places',
      sheetMapped: true,
      gmbEnriched: Boolean(details),
    });
  }
  return enriched;
}

/**
 * Fan out live discovery for a set of areas. Soft-fails per source.
 * Dedupes across Overpass / Nominatim / Places within the fan-out.
 * Stops early when deadlineMs elapses so serverless handlers can return under maxDuration.
 */
/**
 * Prefer the zone name and drop "X 1 Block" style micro-localities when the parent
 * zone (or a shorter parent locality) is already queued. Those blocks rarely geocode
 * and burn the serverless time budget before Practo.com can return clinics.
 */
export function prioritizeLiveAreas(areas = [], maxAreas = 8) {
  const ranked = [...areas].sort((a, b) => {
    const aLoc = String(a.locality || '');
    const bLoc = String(b.locality || '');
    const aZone = aLoc.toLowerCase() === String(a.zone || '').toLowerCase() ? 0 : 1;
    const bZone = bLoc.toLowerCase() === String(b.zone || '').toLowerCase() ? 0 : 1;
    const aBlock = /\b\d+\s*block\b/i.test(aLoc) ? 1 : 0;
    const bBlock = /\b\d+\s*block\b/i.test(bLoc) ? 1 : 0;
    return aZone - bZone || aBlock - bBlock || aLoc.localeCompare(bLoc);
  });

  const out = [];
  const seen = new Set();
  for (const area of ranked) {
    const loc = String(area.locality || area.zone || '').trim();
    if (!loc) continue;
    const key = `${area.city}|${area.zone}|${loc}`.toLowerCase();
    if (seen.has(key)) continue;

    // Skip "Jayanagar 5 Block" when "Jayanagar" is already included
    const parent = loc.replace(/\s+\d+\s*(st|nd|rd|th)?\s*block\b/i, '').trim();
    if (parent && parent.toLowerCase() !== loc.toLowerCase()) {
      const parentAlready = out.some(
        (a) =>
          String(a.city) === String(area.city) &&
          String(a.locality || a.zone || '')
            .toLowerCase()
            .replace(/\s+/g, ' ') === parent.toLowerCase()
      );
      if (parentAlready) continue;
    }

    seen.add(key);
    out.push(area);
    if (out.length >= maxAreas) break;
  }
  return out;
}

/**
 * Live multi-source discovery for a list of areas.
 * Practo.com is queried first (reliable, ~2s). OSM Overpass runs in parallel with a
 * short timeout so flaky Overpass 504s cannot consume the whole serverless budget.
 */
export async function liveDiscoverAreas({
  areas,
  keyword,
  maxAreas = 8,
  perArea = 8,
  deadlineMs = 0,
  targetCount = 0,
  fullScan = false,
} = {}) {
  const scanned = [];
  const leads = [];
  const onServerless = Boolean(process.env.VERCEL);
  const wantFull = fullScan === true || fullScan === '1';
  const slice = prioritizeLiveAreas(areas, maxAreas);
  const started = Date.now();
  let timedOut = false;
  // Soft early-stop so default Refresh returns in ~8–15s instead of waiting for limit=100
  const goal = Math.max(targetCount || 0, perArea * 3, onServerless ? 40 : 60);
  const softStop = wantFull
    ? goal
    : Math.min(goal, onServerless ? Math.max(28, perArea * 2) : Math.max(36, perArea * 2));
  const zoneSpecific = Boolean(
    slice[0]?.zone && String(slice[0].zone).toLowerCase() !== 'all'
  );

  const remainingMs = () => (deadlineMs > 0 ? Math.max(0, deadlineMs - (Date.now() - started)) : 60000);
  const pastDeadline = () => deadlineMs > 0 && remainingMs() < 400;

  // City-level Practo seed
  if (slice[0]?.city && !pastDeadline()) {
    try {
      const cityHit = await searchPractoWeb({
        city: slice[0].city,
        zone: slice[0].zone,
        locality: zoneSpecific ? '' : '',
        keyword,
        limit: zoneSpecific ? Math.min(12, perArea) : Math.max(perArea, Math.min(40, softStop)),
        pages: zoneSpecific ? 1 : wantFull ? 4 : 2,
      });
      if (cityHit.results?.length) {
        leads.push(...cityHit.results);
        scanned.push({
          name: `Practo.com · ${slice[0].city}`,
          status: 'scanned',
          count: cityHit.results.length,
        });
      } else {
        scanned.push({
          name: `Practo.com · ${slice[0].city}`,
          status: cityHit.ok ? 'empty' : 'error',
          count: 0,
          detail: cityHit.status ? `HTTP ${cityHit.status}` : undefined,
        });
      }
    } catch (err) {
      scanned.push({ name: `Practo.com · ${slice[0].city}`, status: 'error', detail: err.message });
    }
  }

  if (dedupeLeads(leads).length >= softStop) {
    return { leads: dedupeLeads(leads), scannedSources: scanned, timedOut };
  }

  for (const area of slice) {
    if (pastDeadline()) {
      timedOut = true;
      scanned.push({
        name: 'Live discovery',
        status: 'timeout',
        detail: `Stopped after ${Math.round(deadlineMs / 1000)}s to keep search responsive`,
      });
      break;
    }

    const zone = area.zone || area.locality;
    const locality = area.locality || area.zone;
    const budget = remainingMs();
    const practoPages = wantFull ? (goal >= 60 ? 5 : 3) : 2;
    const practoLimit = Math.min(wantFull ? 80 : 36, Math.max(perArea * 2, Math.ceil(softStop * 0.75)));

    // Practo first (fast). Only wait on Overpass when Practo is thin — Overpass 504s were
    // stretching every locality to ~6s and made Dermatology feel stuck on "Loading…".
    let practoCount = 0;
    try {
      const found = await searchPractoWeb({
        city: area.city,
        zone,
        locality,
        keyword,
        limit: practoLimit,
        pages: practoPages,
        includeCityFallback: false,
      });
      practoCount = found.results?.length || 0;
      if (practoCount) {
        leads.push(...found.results);
        scanned.push({
          name: `Practo.com · ${locality}`,
          status: 'scanned',
          count: practoCount,
        });
      } else {
        scanned.push({
          name: `Practo.com · ${locality}`,
          status: found.ok ? 'empty' : 'error',
          count: 0,
          detail: found.status ? `HTTP ${found.status}` : undefined,
        });
      }
    } catch (err) {
      scanned.push({
        name: `Practo.com · ${locality}`,
        status: 'error',
        detail: err.message || 'failed',
      });
    }

    const needMaps = practoCount < Math.max(4, Math.floor(perArea / 2));
    const overpassBudget = Math.min(
      onServerless ? (wantFull ? 5000 : 2800) : 10000,
      Math.max(1800, budget - 1500)
    );
    if (needMaps && remainingMs() > overpassBudget + 500) {
      try {
        const rows = await searchOverpass({
          city: area.city,
          zone,
          locality,
          keyword,
          limit: perArea,
          timeoutMs: overpassBudget,
        });
        if (rows.length) {
          leads.push(...rows);
          scanned.push({ name: `OSM Overpass · ${locality}`, status: 'scanned', count: rows.length });
        } else {
          scanned.push({ name: `OSM Overpass · ${locality}`, status: 'empty', count: 0 });
        }
      } catch (err) {
        scanned.push({
          name: `OSM Overpass · ${locality}`,
          status: 'error',
          detail: err.message || 'failed',
        });
      }
    } else if (!needMaps) {
      scanned.push({
        name: `OSM Overpass · ${locality}`,
        status: 'skipped',
        detail: 'Practo.com already returned clinics for this locality',
      });
    }

    if (pastDeadline()) {
      timedOut = true;
      scanned.push({
        name: 'Live discovery',
        status: 'timeout',
        detail: `Stopped after ${Math.round(deadlineMs / 1000)}s to keep search responsive`,
      });
      break;
    }

    // Google Places when keyed (skip if almost out of time)
    if (needMaps && remainingMs() > 2500) {
      try {
        const rows = await searchGooglePlaces({
          city: area.city,
          zone,
          locality,
          keyword,
          limit: perArea,
        });
        if (rows.length) {
          leads.push(...rows);
          scanned.push({ name: `Google Places · ${locality}`, status: 'scanned', count: rows.length });
        }
      } catch (err) {
        scanned.push({ name: `Google Places · ${locality}`, status: 'error', detail: err.message });
      }
    }

    if (dedupeLeads(leads).length >= softStop) break;
  }

  let finalLeads = dedupeLeads(leads);
  if (!timedOut && finalLeads.length && remainingMs() > 1500 && wantFull) {
    try {
      const enriched = await enrichLeadsWithPractoWeb(finalLeads, {
        city: slice[0]?.city,
        keyword,
        deadlineMs: Math.min(remainingMs(), onServerless ? 6000 : 10000),
      });
      finalLeads = enriched.leads;
      scanned.push(...enriched.scanned);
    } catch (err) {
      scanned.push({ name: 'Practo.com enrich', status: 'error', detail: err.message });
    }
  }

  return { leads: dedupeLeads(finalLeads), scannedSources: scanned, timedOut };
}
