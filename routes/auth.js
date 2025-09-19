const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createUser, validatePassword } = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Public registration disabled. Use admin-only endpoint to create accounts.
router.post('/register', (req, res) => {
  return res.status(403).json({ error: 'Public registration is disabled' });
});

// Admin-create endpoint (protected). Admins can create responders or admins.
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.post('/admin/create-user', authenticateJWT, requireAdmin, async (req, res) => {
  const { username, password, email, role, station_id } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['responder', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (station_id !== undefined && station_id !== null && (!Number.isFinite(Number(station_id)) || Number(station_id) <= 0)) {
    return res.status(400).json({ error: 'station_id must be a positive integer' });
  }
  try {
    const user = await createUser({ username, password, email, role, station_id: station_id ? Number(station_id) : null });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await validatePassword(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // build a richer user object to return to the client that includes station info when available
  let station_info = null;
  try {
    const pool = require('../config/db');
    const q = await pool.query('SELECT id, name FROM mandaluyong_fire_stations WHERE id = $1 LIMIT 1', [user.station_id]);
    if (q && q.rows && q.rows.length) station_info = q.rows[0];
  } catch (err) {
    // ignore DB errors here; login should still succeed
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const userPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    station_id: user.station_id || null,
    station_name: station_info ? station_info.name : null
  };

  res.json({ token, user: userPayload });
});

module.exports = router;