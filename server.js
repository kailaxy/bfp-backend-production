// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// CORS configuration for production
const corsOptions = {
  origin: [
    'https://bfp-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Development helper: inject a dev user into requests when NODE_ENV !== 'production'
if (process.env.NODE_ENV !== 'production') {
  try {
    const devAuth = require('./middleware/devAuth');
    app.use(devAuth);
  } catch (err) {
    console.warn('devAuth middleware not available:', err.message);
  }
}

// Import your route modules
const hydrantsRoute           = require('./routes/hydrants');
const incidentsHistoryRoute   = require('./routes/incidentsHistory');
const incidentsReportsRoute   = require('./routes/incidentsReports');
const barangaysRouter         = require('./routes/barangays');
const fireStationsRouter      = require('./routes/firestation');
const activeFiresRoute        = require('./routes/activeFires');
const notificationsRoute     = require('./routes/notifications');
const reverseGeocodeRoute     = require('./routes/reverseGeocode');
const authRoute               = require('./routes/auth');
const usersRoute              = require('./routes/users');
const forecastsRoute          = require('./routes/forecasts');

// Import scheduler service
// Optional scheduler service (may fail if Python dependencies are missing)
let schedulerService = null;
try {
  schedulerService = require('./services/schedulerService');
  console.log('📅 Scheduler service loaded successfully');
} catch (error) {
  console.warn('⚠️  Scheduler service not available (likely missing Python dependencies):', error.message);
}

// Mount routes under /api
app.use('/api/hydrants',           hydrantsRoute);
app.use('/api/incidentsHistory',   incidentsHistoryRoute);
app.use('/api/incidentsReports',   incidentsReportsRoute);
app.use('/api/barangays',          barangaysRouter);
app.use('/api/firestation',        fireStationsRouter);
app.use('/api/active_fires',       activeFiresRoute);
app.use('/api/reverse_geocode',    reverseGeocodeRoute);
app.use('/api/notifications',      notificationsRoute);
app.use('/api/auth',               authRoute);
app.use('/api/users',              usersRoute);
app.use('/api/forecasts',          forecastsRoute);

// Default root route
app.get('/', (req, res) => {
  res.send('BFP Mapping System API is running.');
});

// Health endpoint: DB connectivity and PostGIS check
app.get('/health', async (req, res) => {
  const db = require('./config/db');
  const result = { ok: false, db: { connected: false }, postgis: null };
  try {
    // simple connectivity check
    const r = await db.query('SELECT 1 AS ok');
    if (r && r.rows && r.rows[0] && (r.rows[0].ok === 1 || r.rows[0].ok === '1')) {
      result.db.connected = true;
    }
  } catch (err) {
    result.db.error = String(err && err.message ? err.message : err);
  }

  // Check for PostGIS
  try {
    const pg = await db.query("SELECT PostGIS_full_version() AS ver");
    if (pg && pg.rows && pg.rows[0] && pg.rows[0].ver) result.postgis = String(pg.rows[0].ver);
  } catch (err) {
    result.postgis = null;
    result.postgis_error = String(err && err.message ? err.message : err);
  }

  result.ok = result.db.connected && !!result.postgis;
  res.json(result);
});

// Scheduler status endpoint (admin only)
app.get('/api/scheduler/status', async (req, res) => {
  try {
    if (!schedulerService) {
      return res.json({ 
        error: 'Scheduler service not available', 
        reason: 'Python dependencies may be missing' 
      });
    }
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Manual forecast trigger endpoint (admin only - for testing)
app.post('/api/scheduler/trigger', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }
    
    // This would normally require admin authentication, but keeping simple for now
    if (!schedulerService) {
      return res.status(503).json({ error: 'Scheduler service not available - Python dependencies may be missing' });
    }
    await schedulerService.triggerManualForecasting(parseInt(year), parseInt(month));
    
    res.json({ 
      success: true, 
      message: `Manual forecasting triggered for ${year}-${month.toString().padStart(2, '0')}` 
    });
  } catch (error) {
    console.error('Manual forecasting trigger failed:', error);
    res.status(500).json({ error: 'Failed to trigger manual forecasting: ' + error.message });
  }
});

// Production forecast generation endpoint
app.get('/api/admin/generate-production-forecasts', async (req, res) => {
  try {
    console.log('🚀 Production forecast generation requested via API');
    
    // Try full forecast generation first (requires Python)
    try {
      const generateProductionForecasts = require('./scripts/generate_production_forecasts');
      await generateProductionForecasts();
      
      res.json({ 
        success: true, 
        message: '12-month forecasts generated successfully for production',
        method: 'full-python-forecast',
        startMonth: '2025-10',
        endMonth: '2026-09'
      });
    } catch (pythonError) {
      console.log('⚠️  Python forecast generation failed, falling back to sample data:', pythonError.message);
      
      // Fall back to sample forecast insertion
      const { insertSampleForecasts } = require('./scripts/insert_sample_forecasts');
      const result = await insertSampleForecasts();
      
      res.json({ 
        success: true, 
        message: 'Sample forecasts generated (Python dependencies not available)',
        method: 'sample-data-fallback',
        ...result
      });
    }
  } catch (error) {
    console.error('Production forecast generation failed completely:', error);
    res.status(500).json({ 
      error: 'Failed to generate production forecasts: ' + error.message,
      details: error.stack
    });
  }
});

// Database status check endpoint  
app.get('/api/admin/db-status', async (req, res) => {
  try {
    const db = require('./config/db');
    
    // Check forecasts
    const forecastCount = await db.query('SELECT COUNT(*) as count FROM forecasts');
    const periods = await db.query(`
      SELECT year, month, COUNT(*) as count 
      FROM forecasts 
      GROUP BY year, month 
      ORDER BY year, month
    `);
    
    // Check other tables
    const tables = {};
    const tableNames = ['historical_fires', 'users', 'barangays', 'notifications'];
    for (const table of tableNames) {
      try {
        const count = await db.query(`SELECT COUNT(*) FROM ${table}`);
        tables[table] = parseInt(count.rows[0].count);
      } catch (err) {
        tables[table] = `ERROR: ${err.message}`;
      }
    }
    
    res.json({
      success: true,
      database: {
        connected: true,
        forecasts: {
          total: parseInt(forecastCount.rows[0].count),
          periods: periods.rows
        },
        tables
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      database: { connected: false }
    });
  }
});

// ===== TEMPORARY ARIMA UPLOAD ENDPOINT =====
// This endpoint is temporarily added to upload ARIMA forecasts
app.post('/api/upload-arima-forecasts', async (req, res) => {
  try {
    console.log('📊 ARIMA upload endpoint called, data length:', req.body?.forecasts?.length || 'no data');
    
    const { forecasts } = req.body;
    if (!Array.isArray(forecasts)) {
      return res.status(400).json({ error: 'Forecasts array required' });
    }

    console.log('🔄 Starting batch insert of', forecasts.length, 'forecasts...');
    
    const db = require('./config/db');
    
    // Start transaction
    await db.query('BEGIN');

    try {
      // Clear existing forecasts (optional - comment out if you want to keep existing)
      await db.query('DELETE FROM forecasts');
      console.log('🗑️  Cleared existing forecasts');

      // Insert all forecasts using the correct schema
      let insertCount = 0;
      for (const forecast of forecasts) {
        const query = `
          INSERT INTO forecasts (
            barangay_name, month, year, predicted_cases, 
            lower_bound, upper_bound, risk_level, risk_flag, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `;
        
        await db.query(query, [
          forecast.barangay_name,
          forecast.month,
          forecast.year,
          forecast.predicted_cases,
          forecast.lower_bound || 0,
          forecast.upper_bound || forecast.predicted_cases * 3,
          forecast.risk_level,
          forecast.risk_flag || false
        ]);
        insertCount++;
      }

      await db.query('COMMIT');
      console.log('✅ Successfully uploaded', insertCount, 'ARIMA forecasts');

      // Get verification count
      const verification = await db.query('SELECT COUNT(*) as count FROM forecasts');
      
      res.json({ 
        success: true, 
        message: `Successfully uploaded ${insertCount} ARIMA forecasts`,
        total_in_database: parseInt(verification.rows[0].count)
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ ARIMA upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed: ' + error.message 
    });
  }
});
console.log('📡 Temporary ARIMA upload endpoint added: POST /api/upload-arima-forecasts');

// ===== TEMPORARY ZANIGA ENCODING FIX ENDPOINT =====
app.post('/api/fix-zaniga-encoding', async (req, res) => {
  try {
    const db = require('./config/db');
    
    console.log('🔧 Starting Zaniga encoding fix...');
    
    // Update Old Zañiga to Old Zaniga (handles various encodings)
    const result1 = await db.query(
      "UPDATE forecasts SET barangay_name = 'Old Zaniga' WHERE barangay_name LIKE '%Za%iga%' AND barangay_name LIKE 'Old%'"
    );
    
    // Update New Zañiga to New Zaniga (handles various encodings)
    const result2 = await db.query(
      "UPDATE forecasts SET barangay_name = 'New Zaniga' WHERE barangay_name LIKE '%Za%iga%' AND barangay_name LIKE 'New%'"
    );
    
    // Check what we have now
    const check = await db.query(
      "SELECT DISTINCT barangay_name FROM forecasts WHERE barangay_name LIKE '%Zaniga%' ORDER BY barangay_name"
    );
    
    console.log('✅ Zaniga encoding fixed');
    console.log('📊 Old Zaniga records updated:', result1.rowCount);
    console.log('📊 New Zaniga records updated:', result2.rowCount);
    console.log('📋 Current Zaniga entries:', check.rows.map(r => r.barangay_name));
    
    res.json({
      success: true,
      old_zaniga_updated: result1.rowCount,
      new_zaniga_updated: result2.rowCount,
      current_zaniga_names: check.rows.map(r => r.barangay_name)
    });
    
  } catch (error) {
    console.error('❌ Zaniga fix error:', error);
    res.status(500).json({ error: 'Fix failed: ' + error.message });
  }
});
console.log('🔧 Temporary Zaniga fix endpoint added: POST /api/fix-zaniga-encoding');

// ===== TEMPORARY ACTIVE_FIRES TABLE FIX ENDPOINT =====
app.post('/api/fix-active-fires-table', async (req, res) => {
  try {
    const db = require('./config/db');
    
    console.log('🔧 Starting active_fires table fix...');
    
    // Check current table structure
    const tableInfo = await db.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'active_fires' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current active_fires table structure:', tableInfo.rows);
    
    // Try to create the sequence if it doesn't exist
    try {
      await db.query(`CREATE SEQUENCE IF NOT EXISTS active_fires_id_seq OWNED BY active_fires.id`);
      console.log('✅ Created active_fires_id_seq sequence');
    } catch (seqError) {
      console.log('⚠️ Sequence might already exist:', seqError.message);
    }
    
    // Fix the id column to be auto-incrementing
    await db.query(`
      ALTER TABLE active_fires 
      ALTER COLUMN id SET DEFAULT nextval('active_fires_id_seq'::regclass)
    `);
    
    console.log('✅ Fixed active_fires id column to use sequence');
    
    // Check the updated structure
    const updatedInfo = await db.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'active_fires' AND column_name = 'id'
    `);
    
    res.json({ 
      success: true, 
      message: 'Fixed active_fires table id column',
      before: tableInfo.rows,
      after_id_column: updatedInfo.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Active fires table fix error:', error);
    res.status(500).json({ error: 'Table fix failed: ' + error.message });
  }
});
console.log('🔧 Temporary active_fires fix endpoint added: POST /api/fix-active-fires-table');

// ===== DIAGNOSTIC ENDPOINT =====
app.get('/api/diagnose-active-fires', async (req, res) => {
  try {
    const db = require('./config/db');
    
    // Check table structure
    const tableInfo = await db.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'active_fires' 
      ORDER BY ordinal_position
    `);
    
    // Check sequences
    const sequences = await db.query(`
      SELECT * FROM information_schema.sequences 
      WHERE sequence_name LIKE '%active_fires%'
    `);
    
    // Check constraints
    const constraints = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'active_fires'
    `);
    
    res.json({
      table_structure: tableInfo.rows,
      sequences: sequences.rows,
      constraints: constraints.rows
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== NOTIFICATIONS TABLE DIAGNOSTIC =====
app.get('/api/diagnose-notifications', async (req, res) => {
  try {
    const db = require('./config/db');
    
    // Check if notifications table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Check table structure
      const tableInfo = await db.query(`
        SELECT column_name, column_default, is_nullable, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        ORDER BY ordinal_position
      `);
      
      res.json({
        table_exists: true,
        table_structure: tableInfo.rows
      });
    } else {
      res.json({
        table_exists: false,
        message: 'Notifications table does not exist'
      });
    }
    
  } catch (error) {
    console.error('Notifications diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FORECASTS DATA DIAGNOSTIC =====
app.get('/api/diagnose-forecasts', async (req, res) => {
  try {
    const db = require('./config/db');
    
    // Check total count in forecasts table
    const totalCount = await db.query('SELECT COUNT(*) as total FROM forecasts');
    
    // Check available forecast years and months
    const availableData = await db.query(`
      SELECT DISTINCT year, month, COUNT(*) as barangay_count
      FROM forecasts 
      GROUP BY year, month 
      ORDER BY year, month
    `);
    
    // Check October 2025 specifically
    const oct2025 = await db.query(`
      SELECT COUNT(*) as count, 
             array_agg(DISTINCT barangay_name) as barangays
      FROM forecasts 
      WHERE year = 2025 AND month = 10
    `);
    
    // Get a few sample records
    const samples = await db.query('SELECT * FROM forecasts LIMIT 3');
    
    res.json({
      total_records: totalCount.rows[0].total,
      available_data: availableData.rows,
      october_2025: oct2025.rows[0],
      sample_records: samples.rows
    });
    
  } catch (error) {
    console.error('Forecasts diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 BFP Backend Server started successfully!`);
  console.log(`📍 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for frontend origins`);
  
  // Start the monthly forecasting scheduler (optional - continue if it fails)
  if (schedulerService) {
    try {
      schedulerService.start();
      console.log('📅 Monthly forecasting scheduler started successfully');
    } catch (error) {
      console.error('⚠️  Failed to start forecasting scheduler (continuing without it):', error.message);
      console.error('💡 This may be due to missing Python dependencies - server will work without forecasting');
    }
  } else {
    console.log('⚠️  Scheduler service not available - skipping scheduler startup');
  }
  
  console.log('✅ Backend initialization complete');
});

// Global error handler: ensure JSON responses for unexpected errors
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
  } catch (e) {
    // ignore logging errors
  }
  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});
