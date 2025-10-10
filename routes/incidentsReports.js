const express = require('express');
const router = express.Router();
const db = require('../db');
const { geocodeAddress } = require('../services/geocode');
const { matchBarangay } = require('../services/barangayMatch');

const ALLOWED_ALARMS = new Set(['AL1','AL2','AL3','AL4']);

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Base filters
    let where = '';
    const params = [];
    if (q) {
      // search in address and reported_by (case-insensitive)
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where = `WHERE address ILIKE $${params.length - 1} OR reported_by ILIKE $${params.length}`;
    }

    // Count total
    const countSql = `SELECT COUNT(*)::int as total FROM historical_fires ${where}`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0].total || 0;

    // Fetch paginated rows
    params.push(limit);
    params.push(offset);
    const dataSql = `SELECT * FROM historical_fires ${where} ORDER BY reported_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const dataRes = await db.query(dataSql, params);

    res.json({ rows: dataRes.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.post('/', async (req, res) => {
  try {
    let { address, raw_barangay, alarm_level, lat, lng, reported_at, reported_by } = req.body;

    if (!address || !raw_barangay || !alarm_level || !reported_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!ALLOWED_ALARMS.has(alarm_level)) {
      return res.status(400).json({ error: 'Invalid alarm_level' });
    }

    if (lat == null || lng == null) {
      ({ lat, lng } = await geocodeAddress(address));
    }

    const barangay = matchBarangay(raw_barangay);

    const insertSQL = `
      INSERT INTO historical_fires
        (lat, lng, barangay, address, alarm_level, reported_at, reported_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id;
    `;
    const params = [lat, lng, barangay, address, alarm_level, reported_at || new Date(), reported_by];
    const { rows } = await db.query(insertSQL, params);

    console.log(`� New incident report added (ID: ${rows[0].id}) - no forecast generation (user report only)`);

    res.status(201).json({ 
      success: true, 
      fire_id: rows[0].id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/incidentsReports/:id - delete a historical fire record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteSQL = 'DELETE FROM historical_fires WHERE id = $1';
    const result = await db.query(deleteSQL, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    console.log(`🗑️  Deleted historical fire record (ID: ${id})`);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Error deleting historical fire:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
