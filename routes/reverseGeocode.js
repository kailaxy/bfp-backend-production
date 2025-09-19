// routes/reverseGeocode.js
const express            = require('express');
const router             = express.Router();
const pool               = require('../config/db');
const { reverseGeocode } = require('../services/geocode');

router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat & lng required' });
  }

  // 1. Get a human-readable address
  let address;
  try {
    address = await reverseGeocode(lat, lng);
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return res.status(500).json({ error: 'Reverse geocode failed' });
  }

  // 2. Find the barangay polygon
  let barangay = 'Unknown';
  try {
    const { rows } = await pool.query(
      `SELECT name AS barangay
       FROM barangays
       WHERE ST_Contains(
         geom,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)
       )
       LIMIT 1`,
      [lng, lat]
    );
    if (rows[0]?.barangay) barangay = rows[0].barangay;
  } catch (err) {
    console.error('Barangay lookup error:', err);
  }

  return res.json({ address, barangay });
});

module.exports = router;
