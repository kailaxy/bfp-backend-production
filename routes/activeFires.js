// routey/activeFires.js
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const authenticateJWT = require('../middleware/auth');
const requireResponder = require('../middleware/responder');
const ForecastGenerationUtils = require('../services/forecastGenerationUtils');

/**
 * POST /api/active_fires
 * Body: {
 *   lat:           Number,
 *   lng:           Number,
 *   address:       String,
 *   barangay:      String,
 *   alarm_level:   String
 * }
 * Protected: Only authenticated responders/admins can report. The server will set
 * `reported_by` to the authenticated user's username to prevent spoofing.
 */
router.post('/', authenticateJWT, requireResponder, async (req, res) => {
  const {
    lat,
    lng,
    address,
    barangay,
    alarm_level
  } = req.body;

  // Use the authenticated user's username as the reporter (server-side authoritative)
  const reported_by = (req.user && (req.user.username || req.user.name)) ? (req.user.username || req.user.name) : 'Unknown';


  // Log received data for debugging
  console.log('Fire report received:', { lat, lng, address, barangay, alarm_level, reported_by });

  // Basic validation
  if (
    lat == null ||
    lng == null ||
    !address ||
    !barangay ||
    !alarm_level
  ) {
    console.log('Validation failed - missing fields:', { 
      lat: lat == null ? 'missing' : 'ok', 
      lng: lng == null ? 'missing' : 'ok',
      address: !address ? 'missing' : 'ok',
      barangay: !barangay ? 'missing' : 'ok',
      alarm_level: !alarm_level ? 'missing' : 'ok'
    });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const reported_at = new Date();

    // Note: ST_MakePoint expects (lng, lat). Ensure param order matches.
    const { rows } = await pool.query(
      `
      INSERT INTO active_fires
        (address,
         barangay,
         alarm_level,
         reported_by,
         reported_at,
         lat,
         lng,
         location)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7,
         ST_SetSRID(ST_MakePoint($7, $6), 4326)
        )
      RETURNING
        id,
        address,
        barangay,
        alarm_level,
        reported_by,
        reported_at,
        lat,
        lng,
        ST_AsGeoJSON(location)::json AS geometry
      `,
      // params: address, barangay, alarm_level, reported_by, reported_at, lat, lng
      [address, barangay, alarm_level, reported_by, reported_at, lat, lng]
    );

    const row = rows[0];

    const feature = {
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id:           row.id,
        address:      row.address,
        barangay:     row.barangay,
        alarm_level:  row.alarm_level,
        reported_by:  row.reported_by,
        reported_at:  row.reported_at,
        lat:          row.lat,
        lng:          row.lng
      }
    };

    // Notify responders assigned to stations within a configurable radius (meters).
    // If no stations are within the radius, fall back to notifying the single nearest station.
    (async () => {
      try {
        const NOTIFY_RADIUS_METERS = process.env.NOTIFY_RADIUS_METERS ? parseInt(process.env.NOTIFY_RADIUS_METERS, 10) : 2000;

        // point for queries
        const pointSQL = 'ST_SetSRID(ST_MakePoint($1, $2), 4326)'; // $1=lng, $2=lat

        // 1) Find stations within the radius
        const nearbySql = `SELECT id, name
           FROM mandaluyong_fire_stations
           WHERE geom IS NOT NULL
             AND ST_DWithin(geom::geography, ${pointSQL}::geography, $3)
           ORDER BY ST_Distance(geom::geography, ${pointSQL}::geography) ASC`;
        const nearbyParams = [lng, lat, NOTIFY_RADIUS_METERS];
        // debug: log the params and SQL so we can see if a stale process or wrong params persist
        try { console.debug('[active_fires] nearbyQ SQL:', nearbySql); } catch (e) {}
        try { console.debug('[active_fires] nearbyQ params (len=' + nearbyParams.length + '):', nearbyParams); } catch (e) {}
        const nearbyQ = await pool.query(nearbySql, nearbyParams);

        let stations = nearbyQ.rows || [];

        // 2) If none found within radius, fall back to nearest station (the old behavior)
        if (!stations.length) {
          const nearestQ = await pool.query(
            `SELECT id, name
             FROM mandaluyong_fire_stations
             WHERE geom IS NOT NULL
             ORDER BY ST_Distance(geom::geography, ${pointSQL}::geography) ASC
             LIMIT 1`,
            [lng, lat]
          );
          if (nearestQ.rows.length) stations = nearestQ.rows;
        }

        if (!stations.length) return;

        // 3) For each station, notify users assigned to that station (role = 'responder')
        for (const station of stations) {
          const usersQ = await pool.query(`SELECT id, username, email FROM users WHERE station_id = $1 AND role = 'responder'`, [station.id]);
          const users = usersQ.rows || [];
          if (!users.length) continue;

          const message = `New active fire reported near ${station.name || 'your station'}: ${address}`;

          for (const u of users) {
            try {
              await pool.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [u.id, message]);
            } catch (err) {
              console.warn('Could not insert notification (table may be missing):', err && err.message ? err.message : err);
            }
            console.log(`Notification created for user ${u.username} (id=${u.id}) for station ${station.id}`);
          }
        }
      } catch (err) {
        console.error('Error creating notifications for active fire:', err && err.message ? err.message : err);
      }
    })();

    return res.status(201).json(feature);

  } catch (err) {
    console.error('Error inserting active_fires:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      column: err.column
    });
    return res.status(500).json({ 
      error: 'Failed to save active fire',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
    });
  }
});
/**
 * GET /api/active_fires
 * Returns all active fire reports as a GeoJSON FeatureCollection
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        address,
        barangay,
        alarm_level,
        reported_by,
        reported_at,
        lat,
        lng,
        ST_AsGeoJSON(location)::json AS geometry
      FROM active_fires
      ORDER BY reported_at DESC
    `);

    const features = rows.map(r => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        id:           r.id,
        address:      r.address,
        barangay:     r.barangay,
        alarm_level:  r.alarm_level,
        reported_by:  r.reported_by,
        reported_at:  r.reported_at,
        lat:          r.lat,
        lng:          r.lng
      }
    }));

    return res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error('Error fetching active_fires:', err);
    return res.status(500).json({ error: 'Failed to fetch active fires' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { alarm_level } = req.body;
  console.log('PATCH /api/active_fires/:id', id, alarm_level);
  console.log('PATCH body:', req.body);

  try {
    const check = await pool.query('SELECT * FROM active_fires WHERE id = $1', [id]);
    console.log('Check result:', check.rowCount, check.rows);

    const result = await pool.query(
      'UPDATE active_fires SET alarm_level = $1 WHERE id = $2 RETURNING *',
      [alarm_level, id]
    );
    console.log('Update result:', result.rowCount, result.rows);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Active fire not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post('/:id/resolve', async (req, res) => {
  const { id } = req.params;
  console.log('POST /api/active_fires/:id/resolve', id);

  const {
    casualties,
    injuries,
    estimated_damage,
    cause,
    actions_taken,
    verified_by,
    attachments = []
  } = req.body;

  try {
    // 1) Load the active fire record
    const { rows } = await pool.query(
      `SELECT id, lat, lng, barangay, address, alarm_level, reported_at, reported_by
       FROM active_fires
       WHERE id = $1`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Active fire not found' });
    }
    const fire = rows[0];

    // 2) Insert into historical_fires
    await pool.query(
      `INSERT INTO historical_fires
         (id, lat, lng, barangay, address, alarm_level, reported_at,
          resolved_at, casualties, injuries, estimated_damage,
          cause, actions_taken, reported_by, verified_by, attachments)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7,
          NOW(), $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        fire.id,
        fire.lat,
        fire.lng,
        fire.barangay,
        fire.address,
        fire.alarm_level,
        fire.reported_at,
        // resolution details
        casualties    || null,
        injuries      || null,
        estimated_damage || null,
        cause         || null,
        actions_taken || null,
        fire.reported_by,
        verified_by   || null,
        attachments   // text[] column
      ]
    );

    // 3) Delete from active_fires
    await pool.query(`DELETE FROM active_fires WHERE id = $1`, [id]);

    // 4) Trigger automatic 12-month forecast generation
    // Run forecast generation in background (don't wait for completion)  
    ForecastGenerationUtils.triggerAfterFireResolution(id)
      .catch(error => {
        console.error(`❌ Forecast generation error for resolved fire ${id}:`, error);
      });

    return res.json({ 
      message: 'Fire resolved and archived.',
      forecast_generation: 'triggered' // Inform client that forecasts are being updated
    });
  } catch (err) {
    console.error('Error resolving fire:', err);
    return res.status(500).json({ error: 'Failed to resolve fire' });
  }
});

module.exports = router;
