import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { discoverClinics, getDiscoveryMeta } from '../services/clinicDiscovery.js';
import {
  leadDedupeKeys,
  normalizeName,
  normalizePhone,
  isAuthenticLead,
} from '../services/liveDiscovery.js';
import { pickSmartChannel } from '../services/aiAssist.js';

const now = () => new Date().toISOString();

export function registerLeadRoutes(app) {
  app.get('/api/lead-generator/meta', (_req, res) => {
    res.json(getDiscoveryMeta());
  });

  app.post('/api/lead-generator/search', async (req, res) => {
    const body = req.body || {};
    const city = body.city || body.location;
    const {
      zone = 'All',
      zones,
      localities,
      specialty,
      keyword,
      keywords,
      limit = null,
      live = true,
      maxLocalities = 40,
      fullScan = false,
    } = body;
    const kw = keyword || specialty || (Array.isArray(keywords) ? keywords[0] : null);

    if (!city || !kw) {
      return res.status(400).json({
        error:
          'Select city and keyword/specialty (zone can be All; localities auto-expand under zone)',
      });
    }

    try {
      const discovery = await discoverClinics({
        city,
        zone,
        zones,
        localities,
        specialty: kw,
        keyword: kw,
        keywords,
        limit,
        live,
        maxLocalities,
        fullScan: fullScan === true || fullScan === '1',
      });
      if (discovery.error && !discovery.results?.length) {
        return res.status(400).json({ error: discovery.error });
      }
      res.json(discovery);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Discovery failed' });
    }
  });

  app.get('/api/lead-generator/options', (req, res) => {
    const city = (req.query.city || '').toString();
    const zone = (req.query.zone || '').toString();
    const keyword = (req.query.keyword || req.query.specialty || '').toString();
    const meta = getDiscoveryMeta();
    const zones = city ? meta.zonesByCity[city] || [] : [];
    const zoneMeta = city ? meta.zoneMetaByCity[city] || {} : {};
    let keywords = meta.keywords || meta.specialties || [];
    if (city && zone && zone !== 'All') {
      keywords = meta.keywordsByCityZone[`${city}||${zone}`] || [];
    } else if (city) {
      keywords = meta.keywordsByCity[city] || keywords;
    }
    let filteredZones = zones;
    if (city && keyword) {
      filteredZones = zones.filter((z) =>
        (meta.keywordsByCityZone[`${city}||${z}`] || []).includes(keyword)
      );
      if (!filteredZones.length) filteredZones = zones;
    }
    res.json({
      city,
      zone,
      keyword,
      zones: filteredZones,
      zoneMeta,
      keywords,
      cities: meta.cities,
    });
  });

  /** Optional persist of discovered leads (export remains primary). */
  app.post('/api/lead-generator/import', (req, res) => {
    const { leads: incoming = [] } = req.body || {};
    if (!Array.isArray(incoming) || !incoming.length) {
      return res.status(400).json({ error: 'leads array required' });
    }
    const insert = db.prepare(`
      INSERT INTO leads (
        id, name, email, phone, company, title, source, stage, score, value,
        status, assigned_to, last_contacted_at, next_action, notes, created_at, updated_at,
        temperature, preferred_channel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'Unassigned', NULL, ?, ?, ?, ?, ?, ?)
    `);
    const findByPhone = db.prepare(
      `SELECT id FROM leads WHERE replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(','') LIKE ? LIMIT 1`
    );
    const findByEmail = db.prepare(`SELECT id FROM leads WHERE lower(email) = lower(?) LIMIT 1`);
    const findByCompanyCity = db.prepare(
      `SELECT id, company, notes FROM leads WHERE lower(company) = lower(?) LIMIT 20`
    );
    const findByPlaceId = db.prepare(`SELECT id FROM leads WHERE notes LIKE ? LIMIT 1`);
    const created = [];
    const skipped = [];
    const ts = now();
    const tx = db.transaction((items) => {
      const seen = new Set();
      for (const item of items) {
        if (!isAuthenticLead(item) && item.discoverySource === 'sheet_locality') {
          skipped.push({
            reason: 'synthetic_rejected',
            company: item.clinicName || item.company || '',
          });
          continue;
        }
        if (
          /sheet_locality|zone locality expansion|sheet \+ locality/i.test(
            `${item.discoverySource || ''} ${item.source || ''} ${item.matchReason || ''}`
          )
        ) {
          skipped.push({
            reason: 'synthetic_rejected',
            company: item.clinicName || item.company || '',
          });
          continue;
        }
        const owner = item.owner || {};
        const phone = normalizePhone(owner.phone || item.phone || '');
        const email = String(owner.email || item.email || '').trim().toLowerCase();
        const company = String(item.clinicName || item.company || '').trim();
        const contactName = String(owner.name || item.name || company || 'Clinic contact').trim();
        const city = String(item.city || '').trim();
        const placeId = item.placeId || null;
        const batchKeys = leadDedupeKeys({
          ...item,
          phone,
          email,
          clinicName: company,
          owner: { ...owner, phone, email },
        });
        if (batchKeys.some((k) => seen.has(k))) {
          skipped.push({ reason: 'duplicate_in_batch', company });
          continue;
        }
        for (const k of batchKeys) seen.add(k);

        if (placeId && findByPlaceId.get(`%Place ID: ${placeId}%`)) {
          skipped.push({ reason: 'duplicate_place', company, placeId });
          continue;
        }
        if (phone && findByPhone.get(`%${phone}`)) {
          skipped.push({ reason: 'duplicate_phone', company, phone });
          continue;
        }
        if (email && findByEmail.get(email)) {
          skipped.push({ reason: 'duplicate_email', company, email });
          continue;
        }
        if (company && city) {
          const companyHits = findByCompanyCity.all(company);
          const cityLower = city.toLowerCase();
          const locality = String(item.locality || item.zone || '')
            .trim()
            .toLowerCase();
          const dupCompany = companyHits.find((row) => {
            const notes = String(row.notes || '').toLowerCase();
            if (!notes.includes(cityLower)) return false;
            if (locality && notes.includes(locality)) return true;
            return normalizeName(row.company) === normalizeName(company);
          });
          if (dupCompany) {
            skipped.push({ reason: 'duplicate_company', company });
            continue;
          }
        }

        const id = nanoid();
        const marketing = item.marketingHead || null;
        const practo = item.practo || {};
        const platforms = item.platformNames || item.platforms?.map((p) => p.name) || [];
        const channelPick = pickSmartChannel({
          phone: owner.phone || item.phone,
          email: owner.email || item.email,
          score: item.score,
          website: item.website,
          practo,
          notes: practo.hasProfile ? 'Practo profile: Yes' : 'Practo profile: No',
        });
        const notes = [
          item.matchReason || 'Imported from lead generator',
          `Clinic: ${company}`,
          `Specialty: ${item.specialty || item.keyword || ''}`,
          `Location: ${item.locality || item.zone || ''}, ${city || item.location || ''}`,
          `Zone: ${item.zone || ''}`,
          `Address: ${item.address || ''}`,
          `Website: ${item.website || ''}`,
          item.placeId ? `Place ID: ${item.placeId}` : null,
          item.openingHours?.length ? `Hours: ${item.openingHours.join(' | ')}` : null,
          `Owner: ${owner.name || item.name || ''} | ${owner.phone || item.phone || ''} | ${owner.email || item.email || ''}`,
          marketing
            ? `Marketing Head: ${marketing.name} | ${marketing.phone || ''} | ${marketing.email || ''}`
            : 'Marketing Head: Not listed',
          `Practo profile: ${practo.hasProfile ? 'Yes' : 'No'}${practo.url ? ` (${practo.url})` : ''}`,
          `Platforms: ${platforms.join(', ') || 'n/a'}`,
          `Discovery source: ${item.discoverySource || item.source || 'n/a'}`,
          `Smart channel: ${channelPick.channel} (${channelPick.reasons[0] || ''})`,
        ]
          .filter(Boolean)
          .join('\n');

        insert.run(
          id,
          contactName,
          owner.email || item.email || '',
          owner.phone || item.phone || '',
          company || contactName,
          owner.title || item.title || 'Clinic Owner',
          item.source || 'Lead Generator',
          item.temperature === 'hot' ? 'qualified' : 'new',
          item.score ?? 50,
          item.estimatedValue ?? item.value ?? 0,
          `Engage via ${item.suggestedChannel || channelPick.channel}`,
          notes,
          ts,
          ts,
          item.temperature || '',
          item.suggestedChannel || channelPick.channel
        );
        created.push(db.prepare('SELECT * FROM leads WHERE id = ?').get(id));
      }
    });
    tx(incoming);
    res.status(201).json({
      imported: created.length,
      skipped: skipped.length,
      skipReasons: skipped,
      leads: created,
    });
  });
}
