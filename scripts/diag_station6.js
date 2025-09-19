const pool = require('../config/db');
(async ()=>{
  try {
    const f = await pool.query('SELECT id, lat, lng, reported_at FROM active_fires ORDER BY reported_at DESC LIMIT 1');
    console.log('LATEST_ACTIVE_FIRE:', f.rows);
    if (f.rows.length) {
      const { lat, lng } = f.rows[0];
      const station = await pool.query("SELECT id,name,ST_AsText(geom) AS geom_text FROM mandaluyong_fire_stations WHERE geom IS NOT NULL ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) ASC LIMIT 1", [lng, lat]);
      console.log('NEAREST_STATION_TO_FIRE:', station.rows);
    }
  const s6 = await pool.query('SELECT id,name,ST_AsText(geom) AS geom_text FROM mandaluyong_fire_stations WHERE id = $1', [6]);
    console.log('STATION_6:', s6.rows);
    const users = await pool.query('SELECT id,username,station_id,role FROM users WHERE station_id = $1', [6]);
    console.log('USERS_ASSIGNED_TO_6:', users.rows);
    const ids = users.rows.map(u=>u.id);
    if (ids.length) {
      const notif = await pool.query('SELECT id,user_id,message,payload,read,created_at FROM notifications WHERE user_id = ANY($1::int[]) ORDER BY created_at DESC', [ids]);
      console.log('NOTIFICATIONS_FOR_USERS:', notif.rows);
    } else {
      console.log('NO_USERS_ASSIGNED_TO_6');
    }
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
  } finally {
    process.exit(0);
  }
})();
