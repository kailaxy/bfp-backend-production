// Simple helper to inspect notifications for a user
// Usage: node scripts/check_notifications_rows.js [user_id]
const pool = require('../config/db');
const userId = process.argv[2] || process.env.USER_ID || 10;

(async ()=>{
  try {
    const res = await pool.query('SELECT id, user_id, message, payload, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    console.log('status', res.rowCount);
    console.dir(res.rows, { depth: null });
    process.exit(0);
  } catch (err) {
    console.error('DB query error', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
