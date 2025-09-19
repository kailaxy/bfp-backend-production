const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// GET /api/users - list all users (admin only)
router.get('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // include station_id so admin UI can show assigned station after refresh
    const { rows } = await db.query('SELECT id, username, email, role, station_id, created_at FROM users ORDER BY id');
    res.json({ rows });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// PATCH /api/users/:id - update role or reset password
router.patch('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, reset_password, station_id } = req.body;
  try {
    if (role) {
      const { rows } = await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role', [role, id]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: rows[0] });
    }
    if (station_id !== undefined) {
      if (station_id !== null && (!Number.isFinite(Number(station_id)) || Number(station_id) <= 0)) {
        return res.status(400).json({ error: 'station_id must be a positive integer or null' });
      }
      const { rows } = await db.query('UPDATE users SET station_id = $1 WHERE id = $2 RETURNING id, username, email, role, station_id', [station_id ? Number(station_id) : null, id]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: rows[0] });
    }
    if (reset_password) {
      // generate a temporary password
      const temp = Math.random().toString(36).slice(-8) + 'A1';
      const hash = await bcrypt.hash(temp, SALT_ROUNDS);
      const { rows } = await db.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, username, email', [hash, id]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      // NOTE: in production you should email the temp password rather than return it.
      return res.json({ user: rows[0], temp_password: temp });
    }
    res.status(400).json({ error: 'No valid fields to update' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - delete a user
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
