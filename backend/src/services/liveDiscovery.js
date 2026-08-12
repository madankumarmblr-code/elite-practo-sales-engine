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

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || '';
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(dr|clinic|hospital|centre|center|care|dental|the)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
}

export function leadDedupeKey(lead) {
  const phone = normalizePhone(lead.phone || lead.owner?.phone);
  const name = normalizeName(lead.clinicName || lead.company || lead.name);
  const city = String(lead.city || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (phone) return `p:${phone}`;
  if (name && city) return `n:${name}|${city}`;
  return `id:${lead.id || lead.importKey || Math.random()}`;
}

export function dedupeLeads(leads) {
  const seen = new Set();
  const out = [];
  for (const lead of leads) {
    const key = leadDedupeKey(lead);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lead);
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
export async function searchNominatim({ city, locality, keyword, limit = 8 }) {
  const q = `${keyword} clinic ${locality} ${city} India`;
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
    const address = r.display_name || `${locality}, ${city}`;
    return {
      id: `osm-nom-${r.place_id || i}`,
      clinicName: name,
      specialty: keyword,
      keyword,
      city,
      zone: locality,
      locality,
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
export async function searchOverpass({ city, locality, keyword, limit = 12 }) {
  const amenity =
    /dentist|dental|orthodont/i.test(keyword)
      ? 'dentist|clinic|doctors|hospital'
      : /hospital|multi.?special/i.test(keyword)
        ? 'hospital|clinic|doctors'
        : 'clinic|doctors|hospital|dentist';

  const areaName = `${locality}, ${city}`;
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
        tags['addr:suburb'] || locality,
        city,
      ].filter(Boolean);
      const platforms = [
        { name: 'OpenStreetMap', listed: true, url: `https://www.openstreetmap.org/${el.type}/${el.id}` },
        {
          name: 'Google Maps',
          listed: true,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${locality} ${city}`)}`,
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
        zone: locality,
        locality,
        address: addressParts.join(', ') || `${locality}, ${city}`,
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
        matchReason: `OSM Overpass · ${city} · ${locality} · ${keyword}`,
        source: 'OpenStreetMap Overpass (free)',
        discoverySource: 'overpass',
        sheetMapped: true,
      };
    })
    .filter((r) => r.clinicName);
}

/**
 * Google Places Text Search when API key is configured.
 */
export async function searchGooglePlaces({ city, locality, keyword, limit = 12 }) {
  const integ = getIntegrationSecrets('google_maps');
  if (!integ?.hasKey) return [];
  const key = integ.secrets.apiKey;
  const q = `${keyword} clinic in ${locality}, ${city}`;
  const url =
    'https://maps.googleapis.com/maps/api/place/textsearch/json?' +
    new URLSearchParams({ query: q, key, region: 'in', language: 'en' });
  const data = await fetchJson(url, { timeoutMs: 10000 });
  const results = Array.isArray(data.results) ? data.results.slice(0, limit) : [];
  return results.map((r, i) => {
    const name = r.name || `${keyword} Clinic`;
    const address = r.formatted_address || `${locality}, ${city}`;
    const hasWebsite = false;
    return {
      id: `gplaces-${r.place_id || i}`,
      clinicName: name,
      specialty: keyword,
      keyword,
      city,
      zone: locality,
      locality,
      address,
      owner: { name: 'Listing contact', phone: '', email: '', title: 'Clinic contact' },
      marketingHead: null,
      practo: { hasProfile: false, url: null, rating: r.rating || null },
      platforms: [
        {
          name: 'Google My Business',
          listed: true,
          url: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
        },
        {
          name: 'Google Maps',
          listed: true,
          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`,
        },
      ],
      website: null,
      score: 75 + Math.round((r.rating || 0) * 3) + (r.user_ratings_total ? 5 : 0),
      estimatedValue: 80000,
      suggestedChannel: 'whatsapp',
      matchReason: `Google Places · ${city} · ${locality} · ${keyword}`,
      source: 'Google Places API',
      discoverySource: 'google_places',
      sheetMapped: true,
      _hasWebsite: hasWebsite,
    };
  });
}

/**
 * Fan out live discovery for a set of areas. Soft-fails per source.
 */
export async function liveDiscoverAreas({ areas, keyword, maxAreas = 8, perArea = 8 }) {
  const scanned = [];
  const leads = [];
  const slice = areas.slice(0, maxAreas);

  for (const area of slice) {
    // Free Overpass (best structured clinic data)
    try {
      const rows = await searchOverpass({
        city: area.city,
        locality: area.locality,
        keyword,
        limit: perArea,
      });
      leads.push(...rows);
      scanned.push({ name: `OSM Overpass · ${area.locality}`, status: 'scanned', count: rows.length });
    } catch (err) {
      scanned.push({
        name: `OSM Overpass · ${area.locality}`,
        status: 'error',
        detail: err.message,
      });
    }

    // Free Nominatim fallback if Overpass returned little
    if (leads.filter((l) => l.locality === area.locality).length < 3) {
      try {
        await new Promise((r) => setTimeout(r, 1100)); // Nominatim polite rate limit
        const rows = await searchNominatim({
          city: area.city,
          locality: area.locality,
          keyword,
          limit: Math.min(6, perArea),
        });
        leads.push(...rows);
        scanned.push({ name: `Nominatim · ${area.locality}`, status: 'scanned', count: rows.length });
      } catch (err) {
        scanned.push({ name: `Nominatim · ${area.locality}`, status: 'error', detail: err.message });
      }
    }

    // Google Places when key present
    try {
      const rows = await searchGooglePlaces({
        city: area.city,
        locality: area.locality,
        keyword,
        limit: perArea,
      });
      if (rows.length) {
        leads.push(...rows);
        scanned.push({ name: `Google Places · ${area.locality}`, status: 'scanned', count: rows.length });
      }
    } catch (err) {
      scanned.push({ name: `Google Places · ${area.locality}`, status: 'error', detail: err.message });
    }
  }

  return { leads: dedupeLeads(leads), scannedSources: scanned };
}
