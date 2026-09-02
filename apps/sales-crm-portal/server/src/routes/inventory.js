import express from 'express';
import { inventoryService } from '../services/inventoryService.js';
import { store } from '../db/store.js';

export const inventoryRouter = express.Router();

/**
 * GET /api/inventory/search
 * Search Practo Reach & Prime slot inventory, positions, and pricing
 */
inventoryRouter.get('/search', (req, res) => {
  const { city, zone, specialty, availableOnly, newlyOpenedOnly, limit, offset } = req.query;
  const data = inventoryService.search({
    city,
    zone,
    specialty,
    availableOnly: availableOnly === 'true' || availableOnly === '1',
    newlyOpenedOnly: newlyOpenedOnly === 'true' || newlyOpenedOnly === '1',
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
  });
  res.json(data);
});

inventoryRouter.get('/newly-opened', (req, res) => {
  const { limit } = req.query;
  const data = inventoryService.getNewlyOpenedSlots(parseInt(limit, 10) || 20);
  res.json(data);
});

/**
 * GET /api/inventory/stats
 * Overview KPIs of Practo inventory & occupancy
 */
inventoryRouter.get('/stats', (req, res) => {
  const stats = inventoryService.getStats();
  res.json(stats);
});

/**
 * GET /api/inventory/cities
 * Returns all 180 Indian cities with respective zones
 */
inventoryRouter.get('/cities', (req, res) => {
  const cities = inventoryService.getCitiesWithZones();
  res.json({ total: cities.length, cities });
});

/**
 * GET /api/inventory/specialties
 * Returns all 34 verified Practo specialties
 */
inventoryRouter.get('/specialties', (req, res) => {
  const specialties = inventoryService.getSpecialties();
  res.json({ total: specialties.length, specialties });
});

/**
 * POST /api/inventory/sync-live
 * Live synchronization trigger directly from Google Sheet CSV URL
 */
inventoryRouter.post('/sync-live', async (req, res) => {
  const { sheetUrl } = req.body;
  try {
    const result = await inventoryService.syncFromGoogleSheet(sheetUrl);

    store.logAudit({
      action: 'GOOGLE_SHEET_INVENTORY_SYNC',
      entity: `Synchronized ${result.totalRecords} inventory slots across ${result.citiesCount} cities from Google Sheet`,
      user: req.headers['x-user-name'] || 'System Admin',
      ip: req.ip || '127.0.0.1',
      category: 'INTEGRATIONS',
    });

    res.json({
      message: 'Practo inventory successfully synchronized from Google Sheet',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to sync Google Sheet' });
  }
});
