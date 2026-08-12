import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsv } from './csvParse.js';
import { getDataDir } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Bundled with the app (also copied under DATA_DIR when writable). */
const BUNDLED_CSV = path.join(__dirname, '../../data/zone-localities.csv');
const RUNTIME_CSV = path.join(getDataDir(), 'zone-localities.csv');

/** @type {Map<string, Map<string, { zoneType: string, localities: string[] }>> | null} */
let cache = null;

function loadRows() {
  const candidates = [RUNTIME_CSV, BUNDLED_CSV];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    return parseCsv(text, { columns: true, skip_empty_lines: true, trim: true });
  }
  return [];
}

function ensureRuntimeCopy() {
  try {
    if (!fs.existsSync(RUNTIME_CSV) && fs.existsSync(BUNDLED_CSV)) {
      fs.mkdirSync(path.dirname(RUNTIME_CSV), { recursive: true });
      fs.copyFileSync(BUNDLED_CSV, RUNTIME_CSV);
    }
  } catch {
    /* /tmp may be read-only in rare cases */
  }
}

/**
 * Internal reference index: City → Zone → localities covered by that zone.
 * Used so "Bangalore · Vijayanagar · Dentist" also searches Deepanjalinagar, Chandra Layout, etc.
 */
export function getZoneLocalityIndex() {
  if (cache) return cache;
  ensureRuntimeCopy();
  /** @type {Map<string, Map<string, { zoneType: string, localities: Set<string> }>>} */
  const byCity = new Map();
  for (const row of loadRows()) {
    const city = String(row.city || '').trim();
    const zone = String(row.zone || '').trim();
    const locality = String(row.locality || '').trim();
    const zoneType = String(row.zone_type || row.zoneType || 'ZONE').trim() || 'ZONE';
    if (!city || !zone || !locality) continue;
    if (!byCity.has(city)) byCity.set(city, new Map());
    const zones = byCity.get(city);
    if (!zones.has(zone)) zones.set(zone, { zoneType, localities: new Set() });
    const entry = zones.get(zone);
    entry.localities.add(locality);
    if (zoneType) entry.zoneType = zoneType;
  }

  /** @type {Map<string, Map<string, { zoneType: string, localities: string[] }>>} */
  const normalized = new Map();
  for (const [city, zones] of byCity) {
    const zMap = new Map();
    for (const [zone, entry] of zones) {
      zMap.set(zone, {
        zoneType: entry.zoneType,
        localities: [...entry.localities].sort((a, b) => a.localeCompare(b)),
      });
    }
    normalized.set(city, zMap);
  }
  cache = normalized;
  return cache;
}

export function reloadZoneLocalities() {
  cache = null;
  return getZoneLocalityIndex();
}

export function listLocalities(city, zone) {
  const index = getZoneLocalityIndex();
  const zones = index.get(city);
  if (!zones) return [];
  if (!zone || zone === 'All') {
    const all = new Set();
    for (const entry of zones.values()) {
      for (const loc of entry.localities) all.add(loc);
    }
    return [...all].sort((a, b) => a.localeCompare(b));
  }
  return zones.get(zone)?.localities || [];
}

/**
 * Expand selected city/zone into concrete search areas (zone name + covered localities).
 */
export function expandSearchAreas({ city, zone, localities = [], maxLocalities = 40 } = {}) {
  const index = getZoneLocalityIndex();
  const cities = city && city !== 'All' ? [city] : [...index.keys()];
  /** @type {{ city: string, zone: string, locality: string, zoneType: string|null }[]} */
  const areas = [];

  for (const c of cities) {
    const zoneMap = index.get(c);
    // Sheet zones may exist without locality reference — still search the zone name
    const zoneNames =
      zone && zone !== 'All'
        ? [zone]
        : zoneMap
          ? [...zoneMap.keys()]
          : [];

    for (const z of zoneNames) {
      const entry = zoneMap?.get(z);
      const zoneType = entry?.zoneType || 'ZONE';
      let locs = entry?.localities || [];
      if (Array.isArray(localities) && localities.length) {
        const wanted = new Set(localities.map((x) => String(x).toLowerCase()));
        locs = locs.filter((l) => wanted.has(l.toLowerCase()));
      }
      // Always include the zone itself as a search area
      const searchLocalities = [z, ...locs.filter((l) => l.toLowerCase() !== z.toLowerCase())];
      const capped = searchLocalities.slice(0, Math.max(1, maxLocalities));
      for (const locality of capped) {
        areas.push({ city: c, zone: z, locality, zoneType });
      }
      // If no locality reference file match, still emit zone
      if (!capped.length) {
        areas.push({ city: c, zone: z, locality: z, zoneType });
      }
    }
  }

  return areas;
}

export function getZoneLocalityMeta() {
  const index = getZoneLocalityIndex();
  /** @type {Record<string, string[]>} */
  const localitiesByCityZone = {};
  /** @type {Record<string, string[]>} */
  const zonesByCity = {};
  let localityCount = 0;
  let zoneCount = 0;

  for (const [city, zones] of index) {
    zonesByCity[city] = [...zones.keys()].sort((a, b) => a.localeCompare(b));
    zoneCount += zones.size;
    for (const [zone, entry] of zones) {
      localitiesByCityZone[`${city}||${zone}`] = entry.localities;
      localityCount += entry.localities.length;
    }
  }

  return {
    cityCount: index.size,
    zoneCount,
    localityCount,
    zonesByCity,
    localitiesByCityZone,
    sourceFile: 'zone-localities.csv',
  };
}
