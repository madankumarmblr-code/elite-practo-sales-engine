import {
  PRACTO_PRODUCTS,
  DOCTOR_PERSONAS,
  generateDoctorPitch,
  handleDoctorObjection,
} from '../services/aiPitchStudio.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import db from '../db/db.js';

export function registerPitchRoutes(app) {
  // Get all Practo products metadata
  app.get('/api/pitch/products', authRequired, requirePermission('pitch:read', 'dashboard:read'), (_req, res) => {
    res.json({
      products: Object.values(PRACTO_PRODUCTS),
      count: Object.keys(PRACTO_PRODUCTS).length,
    });
  });

  // Get doctor objection personas
  app.get('/api/pitch/personas', authRequired, requirePermission('pitch:read', 'dashboard:read'), (_req, res) => {
    res.json({
      personas: DOCTOR_PERSONAS,
      count: DOCTOR_PERSONAS.length,
    });
  });

  // Generate personalized doctor pitch
  app.post('/api/pitch/generate', authRequired, requirePermission('pitch:write'), (req, res) => {
    try {
      const {
        clinicName,
        doctorName,
        specialty,
        city,
        locality,
        product,
        currentPatientsPerDay,
        avgConsultationFee,
      } = req.body || {};

      if (!clinicName) {
        return res.status(400).json({ error: 'clinicName is required' });
      }

      const result = generateDoctorPitch({
        clinicName,
        doctorName,
        specialty: specialty || 'General Medicine',
        city: city || 'Bangalore',
        locality,
        product: product || 'PRIME',
        currentPatientsPerDay,
        avgConsultationFee,
        reqUser: req.user,
      });

      res.json(result);
    } catch (err) {
      console.error('Pitch generation error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate pitch' });
    }
  });

  // Interactive live objection handling simulator
  app.post('/api/pitch/objection', authRequired, requirePermission('pitch:write'), (req, res) => {
    try {
      const { personaId, objectionQuery, specialty, product } = req.body || {};
      const result = handleDoctorObjection({
        personaId,
        objectionQuery,
        specialty,
        product,
      });
      res.json(result);
    } catch (err) {
      console.error('Objection simulator error:', err);
      res.status(500).json({ error: err.message || 'Objection simulator failed' });
    }
  });

  // Pitch generation history
  app.get('/api/pitch/history', authRequired, requirePermission('pitch:read'), (req, res) => {
    try {
      const limit = Number(req.query.limit) || 20;
      const rows = db
        .prepare('SELECT * FROM doctor_pitch_history ORDER BY created_at DESC LIMIT ?')
        .all(limit);

      const history = rows.map((r) => ({
        ...r,
        pitch_deck: (() => {
          try {
            return JSON.parse(r.pitch_deck || '{}');
          } catch {
            return {};
          }
        })(),
      }));

      res.json({ history, count: history.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to fetch pitch history' });
    }
  });
}
