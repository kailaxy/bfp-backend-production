const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateJWT = require('../middleware/auth');

// NOTE: requires a notifications table. Example migration:
// CREATE TABLE notifications (
//   id SERIAL PRIMARY KEY,
//   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   message TEXT NOT NULL,
//   payload JSONB,
//   read BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

// GET /api/notifications - return unread notifications for the current user
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, message, read, created_at FROM notifications WHERE user_id = $1 AND read = FALSE ORDER BY created_at DESC', [req.user.id]);
    try {
      const debug = process.env.DEBUG_NOTIFICATIONS === '1' || process.env.DEBUG_NOTIFICATIONS === 'true';
      if (rows.length > 0 || debug) {
        console.debug('[notifications] GET unread for user', req.user.id, 'count=', rows.length);
      }
    } catch(e){}
    res.json({ rows });
  } catch (err) {
    console.error('Error fetching notifications:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/mark-read
router.post('/:id/mark-read', authenticateJWT, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    try { console.debug('[notifications] mark-read id=', id, 'user=', req.user.id, 'rows=', result.rowCount); } catch(e){}
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err.message || err);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
