// Dangerous: permanently delete likely test users
// Matches same patterns as cleanup_test_users.js: username ILIKE ANY('%_s', 'test_%', 'temp_%') OR email ILIKE '%@example.com'
// Excludes role='admin' and username='admin'

const pool = require('../config/db');

(async () => {
  try {
    console.log('Connected to PostgreSQL');

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
      console.log('No matching users found.');
      return process.exit(0);
    }

    console.log('Found', res.rows.length, 'users to delete:');
    console.table(res.rows);

    // Confirm deletion by proceeding (script is intentionally destructive). If you'd like a manual prompt, run interactively.
    const ids = res.rows.map(r => r.id);
    const del = await pool.query('DELETE FROM users WHERE id = ANY($1::int[]) RETURNING id, username, email, role, station_id', [ids]);

    console.log('Deleted rows:');
    console.table(del.rows);
    console.log('Permanent deletion complete.');
  } catch (err) {
    console.error('Error deleting users:', err && err.message ? err.message : err);
  } finally {
    process.exit(0);
  }
})();
