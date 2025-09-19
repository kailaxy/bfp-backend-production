// routes/firestations.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { isFloatLike } = require('../utils/validators');

// NOTE: this file introduces endpoints that assume the existence of a
// `station_responders` table with the following schema:
//
// CREATE TABLE station_responders (
//   id SERIAL PRIMARY KEY,
//   station_id INTEGER NOT NULL REFERENCES mandaluyong_fire_stations(id) ON DELETE CASCADE,
//   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   UNIQUE (station_id, user_id)
// );
//
// If you prefer not to create a mapping table, alternatively add a nullable
// `station_id` column to `users` and adapt the queries below.

// POST /api/firestation/:id/assign-responder
// Body: { user_id: Number }
router.post('/:id/assign-responder', authenticateJWT, requireAdmin, async (req, res) => {
  const stationId = req.params.id;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const insert = await pool.query(
      `INSERT INTO station_responders (station_id, user_id) VALUES ($1, $2)
       ON CONFLICT (station_id, user_id) DO NOTHING RETURNING *`,
      [stationId, user_id]
    );
    if (!insert.rows.length) return res.json({ message: 'Responder already assigned' });
    res.json({ assigned: insert.rows[0] });
  } catch (err) {
    console.error('Error assigning responder to station:', err);
    return res.status(500).json({ error: err.message || 'Failed to assign responder' });
  }
});

// GET /api/firestation/:id/responders - list responders assigned to a station
router.get('/:id/responders', authenticateJWT, requireAdmin, async (req, res) => {
  const stationId = req.params.id;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, sr.created_at
       FROM station_responders sr
       JOIN users u ON u.id = sr.user_id
       WHERE sr.station_id = $1
       ORDER BY sr.created_at DESC`,
      [stationId]
    );
    res.json({ rows });
  } catch (err) {
    console.error('Error fetching responders for station:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch responders' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        operator,
        address,
        contact_phone,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM mandaluyong_fire_stations
      WHERE geom IS NOT NULL
    `);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        operator: row.operator,
        address: row.address,
        contact_phone: row.contact_phone,
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geojson);
  } catch (err) {
    console.error('Error fetching fire stations:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch fire stations' });
  }
});

module.exports = router;

// Admin endpoints
router.get('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        operator,
        address,
        contact_phone,
  CASE WHEN geom IS NULL THEN NULL ELSE ST_Y(ST_Centroid(geom))::float END AS latitude,
  CASE WHEN geom IS NULL THEN NULL ELSE ST_X(ST_Centroid(geom))::float END AS longitude
      FROM mandaluyong_fire_stations
      ORDER BY id
    `);
    res.json({ rows: result.rows });
  } catch (err) {
    console.error('Error fetching stations for admin:', err);
    // Return detailed error for local debugging (remove or restrict in production)
    return res.status(500).json({ error: err.message || 'Failed to fetch stations', stack: err.stack });
  }
});

router.patch('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, operator, address, contact_phone, latitude, longitude } = req.body;
  try {
    const updates = [];
    const params = [];
    let idx = 1;
    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (operator !== undefined) { updates.push(`operator = $${idx++}`); params.push(operator); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); params.push(address); }
    if (contact_phone !== undefined) { updates.push(`contact_phone = $${idx++}`); params.push(contact_phone); }
    let setGeom = '';
    if (latitude !== undefined && longitude !== undefined) {
      if (!isFloatLike(latitude) || !isFloatLike(longitude)) return res.status(400).json({ error: 'latitude and longitude must be numbers' });
      setGeom = `, geom = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`;
      params.push(Number(longitude), Number(latitude));
    }
    if (updates.length === 0 && !setGeom) return res.status(400).json({ error: 'No fields to update' });
    const sql = `UPDATE mandaluyong_fire_stations SET ${updates.join(', ')} ${setGeom} WHERE id = $${idx++} RETURNING *`;
    params.push(id);
    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Station not found' });
    res.json({ station: rows[0] });
  } catch (err) {
    console.error('Error updating station:', err);
    return res.status(500).json({ error: err.message || 'Failed to update station', stack: err.stack });
  }
});
