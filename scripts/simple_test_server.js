/**
 * Simple Backend Health Check - No Python Dependencies
 * This script tests basic functionality without requiring Python
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Basic CORS setup
app.use(cors({
  origin: [
    'https://bfp-frontend.onrender.com',
    /\.onrender\.com$/
  ]
}));

app.use(express.json());

// Simple health check
app.get('/health', async (req, res) => {
  try {
    const db = require('../config/db');
    const result = await db.query('SELECT NOW() as current_time, version() as version');
    
    res.json({
      ok: true,
      timestamp: result.rows[0].current_time,
      database: 'connected',
      version: result.rows[0].version.split(',')[0]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Simple forecast data check
app.get('/api/forecasts/test', async (req, res) => {
  try {
    const db = require('../config/db');
    const count = await db.query('SELECT COUNT(*) as count FROM forecasts');
    
    res.json({
      success: true,
      forecastCount: parseInt(count.rows[0].count),
      message: count.rows[0].count > 0 ? 'Forecasts available' : 'No forecasts found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint for October 2025 specifically
app.get('/api/forecasts/2025/10', async (req, res) => {
  try {
    const db = require('../config/db');
    
    const forecasts = await db.query(`
      SELECT 
        id,
        barangay_name,
        month,
        year,
        predicted_cases,
        lower_bound,
        upper_bound,
        risk_level,
        risk_flag,
        created_at
      FROM forecasts 
      WHERE year = 2025 AND month = 10
      ORDER BY barangay_name
    `);
    
    if (forecasts.rows.length === 0) {
      return res.status(404).json({ 
        error: `No forecasts found for 2025-10. Total forecasts in DB: ${(await db.query('SELECT COUNT(*) FROM forecasts')).rows[0].count}` 
      });
    }

    res.json({
      success: true,
      count: forecasts.rows.length,
      forecasts: forecasts.rows
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Simple test server running on port ${PORT}`);
  });
}

module.exports = app;