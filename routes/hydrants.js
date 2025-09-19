// routes/hydrants.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { isIntegerLike, isFloatLike } = require('../utils/validators');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        address,
        type_color,
        is_operational,
        remarks,
        ST_AsGeoJSON(location)::json AS geometry
      FROM hydrants
      WHERE location IS NOT NULL
    `);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        address: row.address,
        type_color: row.type_color,
        is_operational: row.is_operational,
        remarks: row.remarks,
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geojson);
  } catch (err) {
    console.error('Error fetching hydrants:', err && err.message ? err.message : err);
    // Return a JSON error so clients expecting JSON don't throw while parsing
    res.status(500).json({ error: 'Failed to fetch hydrants' });
  }
});

// Admin endpoints
// GET /api/hydrants/admin - list hydrants with full fields
router.get('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Note: some environments may not have a `location_desc` column; avoid selecting it directly.
    const result = await pool.query(`
      SELECT
        id,
        address,
        CASE WHEN location IS NULL THEN NULL ELSE ST_Y(ST_Centroid(location))::float END AS latitude,
        CASE WHEN location IS NULL THEN NULL ELSE ST_X(ST_Centroid(location))::float END AS longitude,
        type_color,
        barangay_id,
        is_operational,
        remarks
      FROM hydrants
      ORDER BY id
    `);
    res.json({ rows: result.rows });
  } catch (err) {
    console.error('Error fetching admin hydrants:', err);
    // For local debugging return the original error and stack so the client can show details.
    // NOTE: remove or restrict this in production.
    return res.status(500).json({ error: err.message || 'Failed to fetch hydrants', stack: err.stack });
  }
});

// PATCH /api/hydrants/:id - update hydrant fields
router.patch('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { address, latitude, longitude, type_color, barangay_id, is_operational, remarks } = req.body;
  try {
    // If latitude/longitude provided, set location using ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    const updates = [];
    const params = [];
    let idx = 1;

    if (address !== undefined) { updates.push(`address = $${idx++}`); params.push(address); }
    if (type_color !== undefined) { updates.push(`type_color = $${idx++}`); params.push(type_color); }
  // Note: do not attempt to update `location_desc` column because it may not exist in some schemas.
    if (barangay_id !== undefined) {
      if (!isIntegerLike(barangay_id)) return res.status(400).json({ error: 'barangay_id must be an integer' });
      updates.push(`barangay_id = $${idx++}`); params.push(Number(barangay_id));
    }
    if (is_operational !== undefined) { updates.push(`is_operational = $${idx++}`); params.push(is_operational); }
    if (remarks !== undefined) { updates.push(`remarks = $${idx++}`); params.push(remarks); }

    let setLocationSql = '';
    if (latitude !== undefined && longitude !== undefined) {
      if (!isFloatLike(latitude) || !isFloatLike(longitude)) return res.status(400).json({ error: 'latitude and longitude must be numbers' });
      setLocationSql = `, location = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`;
      // Note: ST_MakePoint(longitude, latitude)
      params.push(Number(longitude), Number(latitude));
    }

    if (updates.length === 0 && !setLocationSql) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sql = `UPDATE hydrants SET ${updates.join(', ')} ${setLocationSql} WHERE id = $${idx++} RETURNING *`;
    params.push(id);

    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Hydrant not found' });
    res.json({ hydrant: result.rows[0] });
  } catch (err) {
    console.error('Error updating hydrant:', err);
    res.status(500).json({ error: 'Failed to update hydrant' });
  }
});

module.exports = router;
 
