// routes/reverseGeocode.js
const express            = require('express');
const router             = express.Router();
const pool               = require('../config/db');
// Note: Server-side geocoding removed - frontend handles address lookup using Google Maps API

router.get('/', async (req, res) => {
  const { lat, lng, address } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat & lng required' });
  }

  // Note: Address should be provided by frontend using Google Maps Geocoding API
  // Server-side geocoding is disabled to avoid API key restrictions
  // Frontend has proper API key configured for browser requests

  // Find the barangay polygon using coordinates
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

  return res.json({ 
    address: address || 'Address not provided', 
    barangay 
  });
});

module.exports = router;
