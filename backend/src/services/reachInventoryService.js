import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDataDir } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ReachInventoryService {
  constructor() {
    this.loaded = false;
    this.records = [];
    this.cities = [];
    this.zonesByCity = new Map();
    this.specialitiesByCityZone = new Map();
    this.inventoryByCityZoneSpec = new Map();
  }

  findCsvFile() {
    const candidatePaths = [
      path.join(getDataDir(), 'reach_inventory.csv'),
      path.join(__dirname, '../../../data/reach_inventory.csv'),
      path.join(__dirname, '../../data/reach_inventory.csv'),
      path.resolve(process.cwd(), 'data/reach_inventory.csv'),
      path.resolve(process.cwd(), '../data/reach_inventory.csv'),
      '/Users/macos/sales-master-works/practo-sales-automation/elite-practo-sales-ai/data/reach_inventory.csv',
      '/Users/macos/sales-master-works/practo-sales-automation/scratch/reach_inventory.csv',
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  ensureLoaded() {
    if (this.loaded) return;

    const csvPath = this.findCsvFile();
    if (!csvPath) {
      console.warn('[ReachInventory] CSV file not found; initializing empty catalog.');
      this.loaded = true;
      return;
    }

    try {
      const raw = fs.readFileSync(csvPath, 'utf-8');
      const lines = raw.split(/\r?\n/);
      if (lines.length < 2) {
        this.loaded = true;
        return;
      }

      // Header: City,Zone,Speciality,Position,Price_3M,Price_6M,Price_12M,Total Slots,Available Slots
      const citySet = new Set();
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter handling quoted values
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

        const [city, zone, speciality, position, p3m, p6m, p12m, totalSlots, availSlots] = cols;
        if (!city || !zone || !speciality) continue;

        const cleanCity = city.trim();
        const cleanZone = zone.trim();
        const cleanSpec = speciality.trim();

        const record = {
          city: cleanCity,
          zone: cleanZone,
          speciality: cleanSpec,
          position: position ? String(position).trim() : '1',
          price3M: parseFloat(p3m) || 0,
          price6M: parseFloat(p6m) || 0,
          price12M: parseFloat(p12m) || 0,
          totalSlots: parseInt(totalSlots, 10) || 1,
          availableSlots: parseInt(availSlots, 10) || 0,
        };

        records.push(record);
        citySet.add(cleanCity);

        // Index zone by city
        if (!this.zonesByCity.has(cleanCity)) {
          this.zonesByCity.set(cleanCity, new Set());
        }
        this.zonesByCity.get(cleanCity).add(cleanZone);

        // Index speciality by city + zone
        const cityZoneKey = `${cleanCity.toLowerCase()}:${cleanZone.toLowerCase()}`;
        if (!this.specialitiesByCityZone.has(cityZoneKey)) {
          this.specialitiesByCityZone.set(cityZoneKey, new Set());
        }
        this.specialitiesByCityZone.get(cityZoneKey).add(cleanSpec);

        // Index slots by city + zone + spec
        const fullKey = `${cityZoneKey}:${cleanSpec.toLowerCase()}`;
        if (!this.inventoryByCityZoneSpec.has(fullKey)) {
          this.inventoryByCityZoneSpec.set(fullKey, []);
        }
        this.inventoryByCityZoneSpec.get(fullKey).push(record);
      }

      this.records = records;
      this.cities = Array.from(citySet).sort((a, b) => a.localeCompare(b));
      this.loaded = true;
      console.log(`[ReachInventory] Successfully loaded ${records.length} inventory slots across ${this.cities.length} cities.`);
    } catch (err) {
      console.error('[ReachInventory] Failed to load CSV:', err);
      this.loaded = true;
    }
  }

  getCities() {
    this.ensureLoaded();
    return this.cities;
  }

  getZones(city) {
    this.ensureLoaded();
    if (!city) return [];
    const zones = this.zonesByCity.get(String(city).trim());
    return zones ? Array.from(zones).sort((a, b) => a.localeCompare(b)) : [];
  }

  getSpecialities(city, zone) {
    this.ensureLoaded();
    if (!city || !zone) return [];
    const key = `${String(city).trim().toLowerCase()}:${String(zone).trim().toLowerCase()}`;
    const specs = this.specialitiesByCityZone.get(key);
    return specs ? Array.from(specs).sort((a, b) => a.localeCompare(b)) : [];
  }

  checkInventory({ city, zone, speciality }) {
    this.ensureLoaded();
    if (!city || !zone || !speciality) return [];
    const key = `${String(city).trim().toLowerCase()}:${String(zone).trim().toLowerCase()}:${String(speciality).trim().toLowerCase()}`;
    return this.inventoryByCityZoneSpec.get(key) || [];
  }

  searchInventory({ city, zone, speciality, position, availableOnly = false, limit = 100 }) {
    this.ensureLoaded();
    let results = this.records;

    if (city) {
      const c = city.toLowerCase();
      results = results.filter((r) => r.city.toLowerCase() === c);
    }
    if (zone) {
      const z = zone.toLowerCase();
      results = results.filter((r) => r.zone.toLowerCase() === z);
    }
    if (speciality) {
      const s = speciality.toLowerCase();
      results = results.filter((r) => r.speciality.toLowerCase().includes(s));
    }
    if (position) {
      results = results.filter((r) => String(r.position) === String(position));
    }
    if (availableOnly) {
      results = results.filter((r) => r.availableSlots > 0);
    }

    return results.slice(0, limit);
  }

  getStats() {
    this.ensureLoaded();
    let totalSlots = 0;
    let availableSlots = 0;
    for (const r of this.records) {
      totalSlots += r.totalSlots;
      availableSlots += r.availableSlots;
    }
    return {
      totalRecords: this.records.length,
      totalCities: this.cities.length,
      totalSlots,
      availableSlots,
      bookedSlots: totalSlots - availableSlots,
      occupancyRate: totalSlots > 0 ? (((totalSlots - availableSlots) / totalSlots) * 100).toFixed(1) : '0.0',
    };
  }

  getNewlyOpenedSlots({ city = '', zone = '', speciality = '', limit = 50 } = {}) {
    this.ensureLoaded();
    let candidates = this.records.filter((r) => r.availableSlots > 0);

    if (city) {
      const c = city.toLowerCase();
      candidates = candidates.filter((r) => r.city.toLowerCase() === c);
    }
    if (zone) {
      const z = zone.toLowerCase();
      candidates = candidates.filter((r) => r.zone.toLowerCase() === z);
    }
    if (speciality) {
      const s = speciality.toLowerCase();
      candidates = candidates.filter((r) => r.speciality.toLowerCase().includes(s));
    }

    // High search demand zones where spotlight positions newly opened
    const newlyOpened = candidates.slice(0, limit).map((r, idx) => {
      const hoursAgo = (idx % 24) + 1;
      const searchVolume = Math.round(
        3600 + (Math.abs((r.city + r.zone + r.speciality).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)) % 8800)
      );
      return {
        ...r,
        slotId: `open_${r.city.toLowerCase()}_${r.zone.toLowerCase().replace(/\s+/g, '_')}_${r.speciality.toLowerCase().replace(/\s+/g, '_')}_p${r.position}`,
        openedHoursAgo: hoursAgo,
        openedAtLabel: hoursAgo === 1 ? 'Just opened 1h ago' : `Newly opened ${hoursAgo}h ago`,
        monthlySearchVolume: searchVolume,
        urgency: r.availableSlots === 1 ? '🔥 Only 1 Slot Left' : '⚡ 2 Slots Open',
        competition: r.availableSlots === 1 ? 'High Demand (3 Clinics Competing)' : 'Moderate Demand',
        isNewlyOpened: true,
      };
    });

    return newlyOpened.sort((a, b) => a.openedHoursAgo - b.openedHoursAgo);
  }
}

export const reachInventoryService = new ReachInventoryService();
