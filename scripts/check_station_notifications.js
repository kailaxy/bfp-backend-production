// Usage: node scripts/check_station_notifications.js [station_id]
const pool = require('../config/db');
const stationId = Number(process.argv[2] || 1);
(async ()=>{
  try {
    const users = await pool.query('SELECT id, username, station_id, role FROM users WHERE station_id = $1', [stationId]);
    console.log('USERS_ASSIGNED_TO_' + stationId + ':', users.rows);
    const ids = users.rows.map(u=>u.id);
    if (ids.length) {
      const notif = await pool.query('SELECT id,user_id,message,payload,read,created_at FROM notifications WHERE user_id = ANY($1::int[]) ORDER BY created_at DESC', [ids]);
      console.log('NOTIFICATIONS_FOR_USERS:', notif.rows);
    } else {
      console.log('NO_USERS_FOR_STATION', stationId);
    }
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
  } finally { process.exit(0); }
})();
