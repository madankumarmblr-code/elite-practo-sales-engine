/**
 * Live clinic discovery adapters (free + key-based).
 * Free: OpenStreetMap Nominatim + Overpass.
 * Key-based: Google Places when configured in api_integrations.
 */
import db from '../db/db.js';

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

export function leadDedupeKey(lead) {
  return leadDedupeKeys(lead)[0];
}

/**
 * Collapse duplicates across OSM / Places / sheet inventory.
 * Keeps the richest record when keys collide (phone, placeId, name+locality).
 */
export function dedupeLeads(leads) {
  const keyToIndex = new Map();
  const out = [];

  for (const lead of leads) {
    const keys = leadDedupeKeys(lead);
    let hitIndex = -1;
    for (const key of keys) {
      if (keyToIndex.has(key)) {
        hitIndex = keyToIndex.get(key);
        break;
      }
    }
    if (hitIndex >= 0) {
      if (richness(lead) > richness(out[hitIndex])) {
        out[hitIndex] = lead;
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
 * Free Nominatim search — place shortlist for a locality + specialty.
 */
export async function searchNominatim({ city, zone, locality, keyword, limit = 8 }) {
  const area = locality || zone;
  const q = `${keyword} clinic ${area} ${city} India`;
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
      countrycodes: 'in',
    });
  const rows = await fetchJson(url, { timeoutMs: 7000 });
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => {
    const name = r.display_name?.split(',')[0] || r.name || `${keyword} Clinic`;
    const address = r.display_name || `${area}, ${city}`;
    return {
      id: `osm-nom-${r.place_id || i}`,
      clinicName: name,
      specialty: keyword,
      keyword,
      city,
      zone: zone || locality,
      locality: area,
      address,
      lat: r.lat ? Number(r.lat) : null,
      lon: r.lon ? Number(r.lon) : null,
      owner: {
        name: 'Listing contact',
        phone: '',
        email: '',
        title: 'Clinic contact',
      },
      marketingHead: null,
      practo: { hasProfile: false, url: null, rating: null },
      platforms: [
        {
          name: 'OpenStreetMap',
          listed: true,
          url: `https://www.openstreetmap.org/${r.osm_type || 'node'}/${r.osm_id || ''}`,
        },
        {
          name: 'Google Maps',
          listed: true,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        },
        {
          name: 'Google My Business',
          listed: true,
          url: `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${locality} ${city}`)}`,
        },
      ],
      website: null,
      score: 62 + Math.min(20, Math.round(Number(r.importance || 0) * 40)),
      estimatedValue: 55000,
      suggestedChannel: 'whatsapp',
      matchReason: `OSM Nominatim · ${city} · ${locality} · ${keyword}`,
      source: 'OpenStreetMap Nominatim (free)',
      discoverySource: 'nominatim',
      sheetMapped: true,
    };
  });
}

/**
 * Free Overpass query for clinics/hospitals/dentists near a named area.
 */
export async function searchOverpass({ city, zone, locality, keyword, limit = 12 }) {
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
  const geo = await fetchJson(geoUrl, { timeoutMs: 6000 });
  if (!Array.isArray(geo) || !geo[0]) return [];
  const { lat, lon } = geo[0];
  const overpassQuery = `
    [out:json][timeout:15];
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
    signal: AbortSignal.timeout(16000),
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
export async function liveDiscoverAreas({
  areas,
  keyword,
  maxAreas = 8,
  perArea = 8,
  deadlineMs = 0,
} = {}) {
  const scanned = [];
  const leads = [];
  const slice = areas.slice(0, maxAreas);
  const started = Date.now();
  let timedOut = false;

  const pastDeadline = () => deadlineMs > 0 && Date.now() - started >= deadlineMs;

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
    let areaCount = 0;

    // Free Overpass (best structured clinic data)
    try {
      const rows = await searchOverpass({
        city: area.city,
        zone,
        locality,
        keyword,
        limit: perArea,
      });
      leads.push(...rows);
      areaCount += rows.length;
      scanned.push({ name: `OSM Overpass · ${locality}`, status: 'scanned', count: rows.length });
    } catch (err) {
      scanned.push({
        name: `OSM Overpass · ${locality}`,
        status: 'error',
        detail: err.message,
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

    // Free Nominatim fallback if Overpass returned little
    if (areaCount < 3) {
      try {
        await new Promise((r) => setTimeout(r, 1100)); // Nominatim polite rate limit
        if (pastDeadline()) {
          timedOut = true;
          scanned.push({
            name: 'Live discovery',
            status: 'timeout',
            detail: `Stopped after ${Math.round(deadlineMs / 1000)}s to keep search responsive`,
          });
          break;
        }
        const rows = await searchNominatim({
          city: area.city,
          zone,
          locality,
          keyword,
          limit: Math.min(6, perArea),
        });
        leads.push(...rows);
        areaCount += rows.length;
        scanned.push({ name: `Nominatim · ${locality}`, status: 'scanned', count: rows.length });
      } catch (err) {
        scanned.push({ name: `Nominatim · ${locality}`, status: 'error', detail: err.message });
      }
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

    // Google Places when key present
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

  return { leads: dedupeLeads(leads), scannedSources: scanned, timedOut };
}
