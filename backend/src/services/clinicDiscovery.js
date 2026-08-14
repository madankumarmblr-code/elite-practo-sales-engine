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
import {
  dedupeLeads,
  liveDiscoverAreas,
  filterAuthenticLeads,
  isAuthenticLead,
  prioritizeLiveAreas,
} from './liveDiscovery.js';
import { applySmartChannelToDiscoveryLead } from './aiAssist.js';

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
      sources: ['all', 'live', 'practo_web', 'overpass', 'google_places'],
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
 * Live Practo.com + OSM (+ Google Places when keyed). No synthetic inventory.
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
  maxLocalities = 40,
  fullScan = false,
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

  const perLocality = {};
  for (const area of areas) {
    perLocality[area.locality] = perLocality[area.locality] || 0;
  }

  const liveEnabled = live !== false && live !== '0';
  const onServerless = Boolean(process.env.VERCEL);
  const wantFull = fullScan === true || fullScan === '1';
  const liveBudgetMs = onServerless ? (wantFull ? 45000 : 18000) : wantFull ? 90000 : 35000;
  const maxLiveAreas = onServerless ? (wantFull ? 8 : 4) : wantFull ? 16 : 8;
  const perArea = onServerless ? (wantFull ? 24 : 14) : wantFull ? 30 : 16;
  const targetCount =
    limit == null || limit === '' || Number(limit) <= 0
      ? wantFull
        ? 150
        : 40
      : Number(limit);

  let liveLeads = [];
  let liveScanned = [];
  let liveTimedOut = false;
  if (liveEnabled) {
    try {
      const liveAreas = prioritizeLiveAreas(areas, Math.min(maxLiveAreas, areas.length));
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
          targetCount,
          fullScan: wantFull,
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

  for (const lead of liveLeads) {
    const loc = lead.locality || lead.zone;
    if (!loc) continue;
    perLocality[loc] = (perLocality[loc] || 0) + 1;
  }

  const beforeDedupe = liveLeads.length;
  const authentic = filterAuthenticLeads(liveLeads);
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
      authenticOnly: true,
      fullScan: wantFull,
      targetCount,
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
      liveTimedOut,
      platformsCovered: PLATFORMS.length,
      source: liveEnabled ? 'practo.com+osm+places' : 'none',
      authenticOnly: true,
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
