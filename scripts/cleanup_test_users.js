// Safe cleanup script: soft-delete likely test users
// Criteria (configurable): username ends with '_s', username starts with 'test_', email ends with '@example.com', or username like 'temp_%'
// Exclude: role = 'admin', username = 'admin'

const pool = require('../config/db');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

(async () => {
  try {
    console.log('Connected to PostgreSQL');

    // Build SELECT criteria - adjust patterns as needed
    const patterns = ["%_s", "test_%", "temp_%"];
    const emailPattern = "%@example.com";

    const selectQ = `SELECT id, username, email, role, station_id FROM users
      WHERE (
        username ILIKE ANY (ARRAY[${patterns.map((_,i)=>`$${i+1}`).join(',')}])
        OR email ILIKE $${patterns.length+1}
      )
      AND role != 'admin' AND username != 'admin'`;

  const selectParams = [...patterns, emailPattern];

  const res = await pool.query(selectQ, selectParams);
    if (!res.rows.length) {
      console.log('No test users found with the configured patterns.');
      return process.exit(0);
    }

    console.log('Found', res.rows.length, 'candidate test users:');
    console.table(res.rows);

    // Confirm: since this runs unattended, we'll proceed but report what we'll change.
    // Soft-delete action: do NOT change role (DB restricts role values). Instead:
    // - set email = NULL
    // - set password_hash = random hash (disable login)
    // - set station_id = NULL
    // - update updated_at = NOW()
    // If a deleted_at column exists, set it as well.
    const ids = res.rows.map(r => r.id);
    const fakePassword = Date.now().toString() + Math.random();
    const fakeHash = await bcrypt.hash(fakePassword, SALT_ROUNDS);

    // Check if deleted_at column exists
    const colQ = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='deleted_at'`);
    const hasDeletedAt = colQ.rows.length > 0;

    let updateQ;
    let params;
    if (hasDeletedAt) {
      updateQ = `UPDATE users SET email = NULL, password_hash = $2, station_id = NULL, deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1::int[]) RETURNING id, username, email, role, station_id, deleted_at, updated_at`;
      params = [ids, fakeHash];
    } else {
      updateQ = `UPDATE users SET email = NULL, password_hash = $2, station_id = NULL, updated_at = NOW() WHERE id = ANY($1::int[]) RETURNING id, username, email, role, station_id, updated_at`;
      params = [ids, fakeHash];
    }

    const upd = await pool.query(updateQ, params);

    console.log('Updated records:');
    console.table(upd.rows);

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Error during cleanup:', err && err.message ? err.message : err);
  } finally {
    process.exit(0);
  }
})();
