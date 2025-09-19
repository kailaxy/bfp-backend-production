const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

// GET /api/barangays
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        population,
        population_date,
        osm_relation_id,
        ST_AsGeoJSON(geom)::json AS geometry,
        brief_history,
        economic_profile
      FROM barangays;
    `;

    const result = await pool.query(query);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
        population: row.population,
        population_date: row.population_date,
        osm_relation_id: row.osm_relation_id,
        brief_history: row.brief_history,
        economic_profile: row.economic_profile,
      },
    }));

    res.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// Admin endpoints
// GET /api/barangays/admin - list barangays for admin management
router.get('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const query = `SELECT id, name, population, population_date, osm_relation_id, brief_history, economic_profile FROM barangays ORDER BY id`;
    const result = await pool.query(query);
    res.json({ rows: result.rows });
  } catch (err) {
    console.error('Error fetching barangays for admin:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch barangays', stack: err.stack });
  }
});

// PATCH /api/barangays/:id - update barangay (admin only)
const { isIntegerLike } = require('../utils/validators');

router.patch('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, population, population_date, brief_history, economic_profile, osm_relation_id } = req.body;
  try {
    const updates = [];
    const params = [];
    let idx = 1;
    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (population !== undefined) {
      if (!isIntegerLike(population)) return res.status(400).json({ error: 'population must be an integer' });
      updates.push(`population = $${idx++}`); params.push(Number(population));
    }
    if (population_date !== undefined) { updates.push(`population_date = $${idx++}`); params.push(population_date); }
    if (brief_history !== undefined) { updates.push(`brief_history = $${idx++}`); params.push(brief_history); }
    if (economic_profile !== undefined) { updates.push(`economic_profile = $${idx++}`); params.push(economic_profile); }
    if (osm_relation_id !== undefined) { updates.push(`osm_relation_id = $${idx++}`); params.push(osm_relation_id); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE barangays SET ${updates.join(', ')} WHERE id = $${idx++} RETURNING *`;
    params.push(id);
    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Barangay not found' });
    res.json({ barangay: rows[0] });
  } catch (err) {
    console.error('Error updating barangay:', err);
    return res.status(500).json({ error: err.message || 'Failed to update barangay', stack: err.stack });
  }
});

// DELETE /api/barangays/:id - delete barangay (admin only)
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM barangays WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Barangay not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting barangay:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete barangay', stack: err.stack });
  }
});
