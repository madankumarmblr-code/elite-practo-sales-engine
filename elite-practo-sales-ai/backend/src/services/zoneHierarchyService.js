import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDataDir } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_LOCALITY_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSAOJ06dlrv8dfjyRgx7Z4Azr5X8oN6nswGxUOBPouxh4Z1114-8kdpU9tpVGLTOP31khfq8N_uFatN/pub?output=csv';

class ZoneHierarchyService {
  constructor() {
    this.loaded = false;
    this.cities = [];
    this.zonesByCity = new Map(); // cityLower => Set of zone names
    this.localitiesByCityZone = new Map(); // `${cityLower}:${zoneLower}` => Set of locality names
    this.zoneByCityLocality = new Map(); // `${cityLower}:${localityLower}` => zone name
    this.lastSyncedAt = null;
    this.init();
  }

  findCsvFile() {
    const candidatePaths = [
      path.join(getDataDir(), 'practo_city_zone_locality.csv'),
      path.join(__dirname, '../../../data/practo_city_zone_locality.csv'),
      path.join(__dirname, '../../data/practo_city_zone_locality.csv'),
      path.resolve(process.cwd(), 'data/practo_city_zone_locality.csv'),
      path.resolve(process.cwd(), '../data/practo_city_zone_locality.csv'),
      '/Users/macos/sales-master-works/practo-sales-automation/data/practo_city_zone_locality.csv',
      '/Users/macos/sales-master-works/practo-sales-automation/elite-practo-sales-ai/data/practo_city_zone_locality.csv',
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  init() {
    const csvPath = this.findCsvFile();
    if (csvPath) {
      try {
        const raw = fs.readFileSync(csvPath, 'utf8');
        this.parseCsv(raw, csvPath);
      } catch (err) {
        console.warn('[ZoneHierarchy] Error reading CSV:', err.message);
      }
    }
  }

  parseCsv(raw, sourceLabel = 'local') {
    if (!raw || typeof raw !== 'string') return 0;
    const lines = raw.split(/\r?\n/);
    if (lines.length < 2) return 0;

    const citySet = new Set();
    const zonesByCity = new Map();
    const localitiesByCityZone = new Map();
    const zoneByCityLocality = new Map();

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV parsing
      const cols = [];
      let cur = '';
      let inQuote = false;
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          cols.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());

      const [city, zone, _ztype, locality] = cols;
      if (!city || !zone || !locality) continue;

      const cleanCity = city.trim();
      const cleanZone = zone.trim();
      const cleanLocality = locality.trim().replace(/^"|"$/g, '');

      citySet.add(cleanCity);

      const cityKey = cleanCity.toLowerCase();
      if (!zonesByCity.has(cityKey)) {
        zonesByCity.set(cityKey, new Set());
      }
      zonesByCity.get(cityKey).add(cleanZone);

      const cityZoneKey = `${cityKey}:${cleanZone.toLowerCase()}`;
      if (!localitiesByCityZone.has(cityZoneKey)) {
        localitiesByCityZone.set(cityZoneKey, new Set());
      }
      localitiesByCityZone.get(cityZoneKey).add(cleanLocality);

      const cityLocKey = `${cityKey}:${cleanLocality.toLowerCase()}`;
      zoneByCityLocality.set(cityLocKey, cleanZone);

      count++;
    }

    if (count > 0) {
      this.cities = Array.from(citySet).sort((a, b) => a.localeCompare(b));
      this.zonesByCity = zonesByCity;
      this.localitiesByCityZone = localitiesByCityZone;
      this.zoneByCityLocality = zoneByCityLocality;
      this.loaded = true;
      this.lastSyncedAt = new Date().toISOString();
      console.log(`[ZoneHierarchy] Successfully parsed ${count} mappings across ${this.cities.length} cities from ${sourceLabel}`);
    }

    return count;
  }

  async syncFromGoogleSheet(sheetUrl = DEFAULT_LOCALITY_SHEET_CSV_URL) {
    try {
      console.log(`[ZoneHierarchy] Syncing hierarchy from ${sheetUrl}...`);
      const res = await fetch(sheetUrl, {
        headers: { 'User-Agent': 'EliteSalesEngine/2.0 (GoogleSheetSync)' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Google Sheet HTTP ${res.status}: ${res.statusText}`);
      }

      const csvText = await res.text();
      const count = this.parseCsv(csvText, sheetUrl);

      if (count > 0) {
        // Persist to local disk
        const savePaths = [
          path.resolve(process.cwd(), 'data/practo_city_zone_locality.csv'),
          path.resolve(process.cwd(), '../data/practo_city_zone_locality.csv'),
          '/Users/macos/sales-master-works/practo-sales-automation/data/practo_city_zone_locality.csv',
          '/Users/macos/sales-master-works/practo-sales-automation/elite-practo-sales-ai/data/practo_city_zone_locality.csv',
        ];
        for (const p of savePaths) {
          try {
            const dir = path.dirname(p);
            if (fs.existsSync(dir)) {
              fs.writeFileSync(p, csvText, 'utf8');
            }
          } catch {}
        }
      }

      return {
        success: true,
        count,
        cities: this.cities.length,
        syncedAt: this.lastSyncedAt,
      };
    } catch (err) {
      console.error('[ZoneHierarchy] Sync error:', err.message);
      return { success: false, error: err.message };
    }
  }

  getCities() {
    if (!this.loaded || this.cities.length === 0) {
      return ['Bangalore', 'Delhi', 'Mumbai', 'Chennai', 'Hyderabad', 'Pune'];
    }
    return this.cities;
  }

  getZones(city = 'Bangalore') {
    const key = (city || 'Bangalore').toLowerCase();
    const set = this.zonesByCity.get(key);
    if (!set || set.size === 0) {
      return ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'JP Nagar', 'Jayanagar'];
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  getLocalities(city = 'Bangalore', zone = 'Indiranagar') {
    const cityKey = (city || 'Bangalore').toLowerCase();
    const zoneKey = (zone || 'Indiranagar').toLowerCase();
    const set = this.localitiesByCityZone.get(`${cityKey}:${zoneKey}`);
    if (!set || set.size === 0) {
      return [zone];
    }
    const arr = Array.from(set);
    // Put matching zone name first if present, then alphabetical
    return arr.sort((a, b) => {
      if (a.toLowerCase() === zoneKey) return -1;
      if (b.toLowerCase() === zoneKey) return 1;
      return a.localeCompare(b);
    });
  }

  getZoneForLocality(city = 'Bangalore', locality = '') {
    if (!locality) return '';
    const cityKey = (city || 'Bangalore').toLowerCase();
    const locKey = locality.toLowerCase();
    return this.zoneByCityLocality.get(`${cityKey}:${locKey}`) || '';
  }

  isLocalityInZone(city = 'Bangalore', zone = '', locality = '') {
    if (!zone || !locality) return true;
    const locs = this.getLocalities(city, zone);
    const locLower = locality.toLowerCase();
    return locs.some((l) => l.toLowerCase() === locLower || locLower.includes(l.toLowerCase()) || l.toLowerCase().includes(locLower));
  }
}

export const zoneHierarchyService = new ZoneHierarchyService();
export default zoneHierarchyService;
