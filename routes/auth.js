const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createUser, validatePassword } = require('../models/user');

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

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

  // Create short-lived access token (30 minutes) and long-lived refresh token (7 days)
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role, type: 'access' },
    JWT_SECRET,
    { expiresIn: '30m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Store refresh token in database (you might want to create a refresh_tokens table)
  try {
    const pool = require('../config/db');
    // For simplicity, we'll store it in a simple way. In production, consider a dedicated table.
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
  } catch (err) {
    console.error('Error storing refresh token:', err);
    // Continue even if refresh token storage fails
  }

  const userPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    station_id: user.station_id || null,
    station_name: station_info ? station_info.name : null
  };

  res.json({ 
    token: accessToken, // Keep same property name for backward compatibility
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: userPayload 
  });
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if refresh token exists in database
    const pool = require('../config/db');
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, refreshToken]);
    
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = result.rows[0];

    // Get station info
    let station_info = null;
    try {
      const q = await pool.query('SELECT id, name FROM mandaluyong_fire_stations WHERE id = $1 LIMIT 1', [user.station_id]);
      if (q && q.rows && q.rows.length) station_info = q.rows[0];
    } catch (err) {
      // ignore DB errors
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, type: 'access' },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    const userPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      station_id: user.station_id || null,
      station_name: station_info ? station_info.name : null
    };

    res.json({
      token: newAccessToken,
      accessToken: newAccessToken,
      user: userPayload
    });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;