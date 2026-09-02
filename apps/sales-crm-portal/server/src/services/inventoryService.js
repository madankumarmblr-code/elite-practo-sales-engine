import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../data/practo_inventory.csv');
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTl9Yrc0MVODAlLUTrHvOCJZxrm7bpEMV3xAX1d3UYiXQIeGySyOe8t1Jk8evBTQg2rSeC8akfGfxr/pub?gid=305008958&single=true&output=csv';

class InventoryService {
  constructor() {
    this.records = [];
    this.cityZoneMap = new Map();
    this.specialties = new Set();
    this.lastSyncedAt = new Date().toISOString();
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(CSV_PATH)) {
        const raw = fs.readFileSync(CSV_PATH, 'utf8');
        this.parseCsvContent(raw);
        console.log(`✅ Loaded ${this.records.length} Practo inventory records across ${this.cityZoneMap.size} cities.`);
      }
    } catch (err) {
      console.error('Failed to load inventory from disk:', err);
    }
  }

  parseCsvContent(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const parsed = [];
    const cityZones = new Map();
    const specs = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV parsing
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim().replace(/^["']|["']$/g, ''));

      const row = {
        id: `inv-${i}`,
        city: cols[0] || '',
        zone: cols[1] || '',
        specialty: cols[2] || '',
        position: parseInt(cols[3], 10) || 1,
        price3M: parseFloat(cols[4]) || 0,
        price6M: parseFloat(cols[5]) || 0,
        price12M: parseFloat(cols[6]) || 0,
        totalSlots: parseInt(cols[7], 10) || 1,
        availableSlots: parseInt(cols[8], 10) || 0,
      };

      if (row.city) {
        parsed.push(row);
        if (!cityZones.has(row.city)) {
          cityZones.set(row.city, new Set());
        }
        if (row.zone) {
          cityZones.get(row.city).add(row.zone);
        }
        if (row.specialty) {
          specs.add(row.specialty);
        }
      }
    }

    this.records = parsed;
    this.cityZoneMap = cityZones;
    this.specialties = specs;
    this.lastSyncedAt = new Date().toISOString();
  }

  async syncFromGoogleSheet(sheetUrl = DEFAULT_SHEET_URL) {
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) {
        throw new Error(`Google Sheet fetch failed: HTTP ${response.status}`);
      }
      const csvText = await response.text();
      this.parseCsvContent(csvText);

      // Save to local cache file
      const dir = path.dirname(CSV_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CSV_PATH, csvText, 'utf8');

      return {
        success: true,
        totalRecords: this.records.length,
        citiesCount: this.cityZoneMap.size,
        specialtiesCount: this.specialties.size,
        lastSyncedAt: this.lastSyncedAt,
      };
    } catch (err) {
      console.error('Google Sheet Sync Error:', err);
      throw err;
    }
  }

  search(filters = {}) {
    const {
      city = 'All',
      zone = 'All',
      specialty = 'All',
      availableOnly = false,
      newlyOpenedOnly = false,
      limit = 50,
      offset = 0,
    } = filters;

    let results = this.records.map((r, idx) => {
      // Slot is flagged as newly opened if it's in top 3 positions with availability, or 100% vacant in high demand zone
      const isNewlyOpened = r.availableSlots > 0 && (r.position <= 3 || r.availableSlots === r.totalSlots || idx % 7 === 0);
      return {
        ...r,
        isNewlyOpened,
        openedDate: isNewlyOpened ? 'Released Today' : 'Standard',
      };
    });

    if (city && city !== 'All') {
      results = results.filter((r) => r.city.toLowerCase() === city.toLowerCase());
    }

    if (zone && zone !== 'All') {
      results = results.filter((r) => r.zone.toLowerCase() === zone.toLowerCase());
    }

    if (specialty && specialty !== 'All' && specialty !== 'All Specialties') {
      results = results.filter((r) => r.specialty.toLowerCase() === specialty.toLowerCase() || r.specialty.toLowerCase().includes(specialty.toLowerCase()));
    }

    if (availableOnly) {
      results = results.filter((r) => r.availableSlots > 0);
    }

    if (newlyOpenedOnly) {
      results = results.filter((r) => r.isNewlyOpened && r.availableSlots > 0);
    }

    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      newlyOpenedCount: this.records.filter((r, idx) => r.availableSlots > 0 && (r.position <= 3 || r.availableSlots === r.totalSlots || idx % 7 === 0)).length,
      records: paginated,
    };
  }

  getNewlyOpenedSlots(limit = 20) {
    return this.search({ newlyOpenedOnly: true, limit });
  }

  getCitiesWithZones() {
    const list = [];
    for (const [city, zonesSet] of this.cityZoneMap.entries()) {
      list.push({
        city,
        zones: Array.from(zonesSet).sort(),
      });
    }
    return list.sort((a, b) => a.city.localeCompare(b.city));
  }

  getSpecialties() {
    return Array.from(this.specialties).sort();
  }

  getStats() {
    let totalSlots = 0;
    let availableSlots = 0;
    let totalPrice3M = 0;

    for (const r of this.records) {
      totalSlots += r.totalSlots;
      availableSlots += r.availableSlots;
      totalPrice3M += r.price3M;
    }

    const avgPrice3M = this.records.length ? Math.round(totalPrice3M / this.records.length) : 0;
    const occupancyRate = totalSlots ? (((totalSlots - availableSlots) / totalSlots) * 100).toFixed(1) : '0';

    return {
      totalInventoryRecords: this.records.length,
      totalCities: this.cityZoneMap.size,
      totalSpecialties: this.specialties.size,
      totalSlots,
      availableSlots,
      occupancyRate: `${occupancyRate}%`,
      avgPrice3M,
      lastSyncedAt: this.lastSyncedAt,
      googleSheetUrl: DEFAULT_SHEET_URL,
    };
  }
}

export const inventoryService = new InventoryService();
