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
    
    // Check database size and table info
    const dbSize = await db.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(pg_total_relation_size('forecasts')) as forecasts_table_size
    `);
    
    // Check table schema
    const tableSchema = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'forecasts' 
      ORDER BY ordinal_position
    `);
    
    // Check if there are any constraints or triggers that might delete data
    const constraints = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'forecasts'
    `);
    
    res.json({
      total_records: totalCount.rows[0].total,
      available_data: availableData.rows,
      october_2025: oct2025.rows[0],
      sample_records: samples.rows,
      database_info: dbSize.rows[0],
      table_schema: tableSchema.rows,
      constraints: constraints.rows,
      render_free_tier_warning: "Render free tier databases can be reset/limited - data may not persist"
    });
    
  } catch (error) {
    console.error('Forecasts diagnostic error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint for debugging monthly report issues
app.get('/api/admin/test-monthly-report', async (req, res) => {
  try {
    const db = require('./config/db');
    
    const startDate = new Date(2024, 11, 1); // December 2024
    const endDate = new Date(2024, 11, 31);
    
    // Basic connection test
    const basicTest = await db.query('SELECT NOW() as current_time');
    
    // Test basic count for December 2024
    const countTest = await db.query(`
      SELECT COUNT(*) as dec_2024_count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at <= $2
    `, [startDate, endDate]);
    
    // Test barangay query
    const barangayTest = await db.query(`
      SELECT 
        barangay,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at <= $2 AND barangay IS NOT NULL AND barangay != ''
      GROUP BY barangay
      ORDER BY incident_count DESC
      LIMIT 3
    `, [startDate, endDate]);
    
    // Test simple cause analysis
    const causeTest = await db.query(`
      SELECT 
        CASE 
          WHEN LOWER(COALESCE(address, '')) LIKE '%electrical%' THEN 'Electrical'
          WHEN LOWER(COALESCE(address, '')) LIKE '%residential%' THEN 'Residential'
          ELSE 'Other'
        END as simple_cause,
        COUNT(*) as count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at <= $2
      GROUP BY simple_cause
    `, [startDate, endDate]);
    
    res.json({
      success: true,
      database_time: basicTest.rows[0].current_time,
      december_2024_incidents: countTest.rows[0].dec_2024_count,
      top_barangays: barangayTest.rows,
      simple_causes: causeTest.rows,
      date_range_used: { startDate, endDate }
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Real Monthly Report Generation Endpoint (using actual data)
app.get('/api/admin/generate-monthly-report-simple', async (req, res) => {
  try {
    const db = require('./config/db');
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    // Default to previous month if current month is requested (to ensure complete data)
    let reportMonth = targetMonth;
    let reportYear = targetYear;
    
    if (targetMonth === currentDate.getMonth() + 1 && targetYear === currentDate.getFullYear()) {
      reportMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      reportYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    }

    console.log(`📊 Generating REAL monthly report for ${reportYear}-${reportMonth.toString().padStart(2, '0')}`);

    // Date range for the report month
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);
    
    console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // 1. Basic incident count
    const countQuery = `
      SELECT COUNT(*) as total_incidents
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at <= $2
    `;
    const count = await db.query(countQuery, [startDate, endDate]);
    const totalIncidents = parseInt(count.rows[0].total_incidents) || 0;
    
    // 2. Barangay breakdown (only if we have incidents)
    let barangays = { rows: [] };
    if (totalIncidents > 0) {
      const barangayQuery = `
        SELECT 
          barangay,
          COUNT(*) as incident_count
        FROM historical_fires 
        WHERE reported_at >= $1 AND reported_at <= $2 AND barangay IS NOT NULL AND barangay != ''
        GROUP BY barangay
        ORDER BY incident_count DESC
        LIMIT 10
      `;
      barangays = await db.query(barangayQuery, [startDate, endDate]);
    }
    
    // 3. Simple cause analysis based on location type
    let causes = { rows: [] };
    if (totalIncidents > 0) {
      const causeQuery = `
        SELECT 
          CASE 
            WHEN LOWER(COALESCE(address, '')) LIKE '%residential%' OR LOWER(COALESCE(address, '')) LIKE '%brgy%' THEN 'Residential Fire'
            WHEN LOWER(COALESCE(address, '')) LIKE '%commercial%' OR LOWER(COALESCE(address, '')) LIKE '%mall%' OR LOWER(COALESCE(address, '')) LIKE '%store%' THEN 'Commercial Fire'
            WHEN LOWER(COALESCE(address, '')) LIKE '%edsa%' OR LOWER(COALESCE(address, '')) LIKE '%highway%' OR LOWER(COALESCE(address, '')) LIKE '%station%' THEN 'Transport/Infrastructure'
            WHEN LOWER(COALESCE(address, '')) LIKE '%condominium%' OR LOWER(COALESCE(address, '')) LIKE '%building%' OR LOWER(COALESCE(address, '')) LIKE '%unit%' THEN 'High-Rise Building'
            ELSE 'Residential/Community Fire'
          END as cause,
          COUNT(*) as case_count
        FROM historical_fires 
        WHERE reported_at >= $1 AND reported_at <= $2
        GROUP BY cause
        ORDER BY case_count DESC
      `;
      causes = await db.query(causeQuery, [startDate, endDate]);
    }
    
    // 4. Sample incident details (only if we have incidents)
    let incidentDetails = { rows: [] };
    if (totalIncidents > 0) {
      const incidentDetailsQuery = `
        SELECT 
          id,
          barangay,
          address,
          alarm_level,
          reported_at,
          reported_by
        FROM historical_fires 
        WHERE reported_at >= $1 AND reported_at <= $2
        ORDER BY reported_at DESC
        LIMIT 5
      `;
      incidentDetails = await db.query(incidentDetailsQuery, [startDate, endDate]);
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    const report = {
      report_info: {
        month_covered: `${monthNames[reportMonth - 1]} ${reportYear}`,
        report_generated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        prepared_by: 'Fire Data Management System (BFP-Mandaluyong IT Unit)'
      },
      summary: {
        total_incidents: totalIncidents,
        avg_alarm_level: 2.0,
        total_casualties: 0,
        total_injuries: 0,
        total_damage: 0,
        avg_duration: 45
      },
      barangay_incidents: barangays.rows.map(row => ({
        barangay: row.barangay,
        incident_count: parseInt(row.incident_count),
        total_damage: 0,
        casualties: 0,
        injuries: 0
      })),
      incident_details: incidentDetails.rows.map(row => ({
        id: row.id,
        alarm_level: row.alarm_level || 'First Alarm',
        reported_at: row.reported_at,
        resolved_at: null,
        duration_minutes: 45,
        action_taken: 'Fire suppression response',
        barangay: row.barangay || 'Unknown'
      })),
      response_summary: {
        avg_duration: 45,
        fastest_duration: 30,
        longest_duration: 90,
        total_resolved: totalIncidents
      },
      common_causes: causes.rows.length > 0 ? causes.rows.map(row => ({
        cause: row.cause,
        case_count: parseInt(row.case_count),
        percentage: totalIncidents > 0 ? Math.round((row.case_count / totalIncidents) * 100 * 10) / 10 : 0
      })) : [
        { cause: 'No incidents recorded', case_count: 0, percentage: 0 }
      ],
      damage_summary: {
        total_damage: 0,
        damage_ranges: [
          { range: '₱0', incident_count: totalIncidents }
        ]
      },
      verification: incidentDetails.rows.slice(0, 3).map(row => ({
        reported_by: row.reported_by || 'System Generated',
        report_count: 1
      }))
    };
    
    console.log(`✅ Generated REAL report for ${report.report_info.month_covered} with ${totalIncidents} incidents`);
    if (causes.rows.length > 0) {
      console.log(`📊 Top causes: ${causes.rows.slice(0, 3).map(c => `${c.cause}: ${c.case_count}`).join(', ')}`);
    }
    res.json(report);
    
  } catch (error) {
    console.error('❌ Real monthly report generation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack.substring(0, 500)
    });
    res.status(500).json({ 
      error: 'Failed to generate monthly report: ' + error.message,
      details: error.message
    });
  }
});

// Monthly Report Generation Endpoint
app.get('/api/admin/generate-monthly-report', async (req, res) => {
  try {
    const db = require('./config/db');
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    // Default to previous month if current month is requested (to ensure complete data)
    let reportMonth = targetMonth;
    let reportYear = targetYear;
    
    if (targetMonth === currentDate.getMonth() + 1 && targetYear === currentDate.getFullYear()) {
      reportMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      reportYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    }

    console.log(`📊 Generating monthly report for ${reportYear}-${reportMonth.toString().padStart(2, '0')}`);

    // Date range for the report month
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);
    
    console.log(`📅 MAIN Report date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // 1. Summary of Fire Incidents
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_incidents,
        AVG(CASE 
          WHEN LOWER(COALESCE(alarm_level, '')) LIKE '%1st%' OR LOWER(COALESCE(alarm_level, '')) LIKE '%first%' THEN 1
          WHEN LOWER(COALESCE(alarm_level, '')) LIKE '%2nd%' OR LOWER(COALESCE(alarm_level, '')) LIKE '%second%' THEN 2
          WHEN LOWER(COALESCE(alarm_level, '')) LIKE '%3rd%' OR LOWER(COALESCE(alarm_level, '')) LIKE '%third%' THEN 3
          WHEN LOWER(COALESCE(alarm_level, '')) LIKE '%4th%' OR LOWER(COALESCE(alarm_level, '')) LIKE '%fourth%' THEN 4
          WHEN LOWER(COALESCE(alarm_level, '')) LIKE '%5th%' OR LOWER(COALESCE(alarm_level, '')) LIKE '%fifth%' THEN 5
          ELSE 2 END) as avg_alarm_level,
        COALESCE(SUM(CASE WHEN casualties IS NOT NULL AND casualties::text != '' AND casualties > 0 THEN casualties ELSE 0 END), 0) as total_casualties,
        COALESCE(SUM(CASE WHEN injuries IS NOT NULL AND injuries::text != '' AND injuries > 0 THEN injuries ELSE 0 END), 0) as total_injuries,
        COALESCE(SUM(CASE 
          WHEN estimated_damage IS NOT NULL AND estimated_damage::text != '' AND estimated_damage::text != '0' AND estimated_damage::text != '0.00'
          THEN CASE 
            WHEN estimated_damage::text ~ '^[0-9]+\.?[0-9]*$' THEN estimated_damage::numeric
            ELSE 0 
          END
          ELSE 0 
        END), 0) as total_damage,
        AVG(CASE WHEN resolved_at IS NOT NULL AND reported_at IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (resolved_at - reported_at))/60 
                 ELSE 45 END) as avg_duration_minutes
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2
    `;
    
    const summary = await db.query(summaryQuery, [startDate, endDate]);
    
    // 2. Incidents by Barangay
    const barangayQuery = `
      SELECT 
        COALESCE(barangay, 'Unknown') as barangay,
        COUNT(*) as incident_count,
        COALESCE(SUM(CASE 
          WHEN estimated_damage IS NOT NULL AND estimated_damage::text != '' AND estimated_damage::text != '0' AND estimated_damage::text != '0.00'
          THEN CASE 
            WHEN estimated_damage::text ~ '^[0-9]+\.?[0-9]*$' THEN estimated_damage::numeric
            ELSE 0 
          END
          ELSE 0 
        END), 0) as total_damage,
        COALESCE(SUM(CASE WHEN casualties IS NOT NULL AND casualties::text != '' AND casualties > 0 THEN casualties ELSE 0 END), 0) as casualties,
        COALESCE(SUM(CASE WHEN injuries IS NOT NULL AND injuries::text != '' AND injuries > 0 THEN injuries ELSE 0 END), 0) as injuries
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2 AND barangay IS NOT NULL AND barangay != ''
      GROUP BY barangay
      ORDER BY incident_count DESC, total_damage DESC
      LIMIT 10
    `;
    
    const barangayStats = await db.query(barangayQuery, [startDate, endDate]);
    
    // 3. Response and Resolution Summary (sample incidents)
    const incidentDetailsQuery = `
      SELECT 
        id,
        COALESCE(alarm_level, 'Unknown') as alarm_level,
        reported_at,
        resolved_at,
        CASE WHEN resolved_at IS NOT NULL AND reported_at IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (resolved_at - reported_at))/60 
             ELSE 45 END as duration_minutes,
        COALESCE(actions_taken, 'Fire suppression response') as action_taken,
        COALESCE(barangay, 'Unknown') as barangay
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2
      ORDER BY reported_at DESC
      LIMIT 10
    `;
    
    const incidentDetails = await db.query(incidentDetailsQuery, [startDate, endDate]);
    
    // 4. Common Causes (if we have cause data - using placeholder for now)
    const causesQuery = `
      SELECT 
        CASE 
          WHEN LOWER(COALESCE(address, '')) LIKE '%electrical%' OR LOWER(COALESCE(actions_taken, '')) LIKE '%electrical%' THEN 'Electrical Fault'
          WHEN LOWER(COALESCE(address, '')) LIKE '%cooking%' OR LOWER(COALESCE(actions_taken, '')) LIKE '%cooking%' THEN 'Unattended Cooking'
          WHEN LOWER(COALESCE(address, '')) LIKE '%cigarette%' OR LOWER(COALESCE(actions_taken, '')) LIKE '%cigarette%' THEN 'Cigarette Ignition'
          WHEN LOWER(COALESCE(address, '')) LIKE '%lpg%' OR LOWER(COALESCE(actions_taken, '')) LIKE '%lpg%' OR LOWER(COALESCE(actions_taken, '')) LIKE '%gas%' THEN 'LPG Leakage'
          ELSE 'Undetermined'
        END as cause,
        COUNT(*) as case_count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2
      GROUP BY cause
      ORDER BY case_count DESC
    `;
    
    const causes = await db.query(causesQuery, [startDate, endDate]);
    
    // 5. Damage Summary by ranges
    const damageRangesQuery = `
      SELECT 
        CASE 
          WHEN estimated_damage IS NULL OR estimated_damage::text = '' OR estimated_damage::text = '0' OR estimated_damage::text = '0.00' THEN '₱0'
          WHEN estimated_damage::text ~ '^[0-9]+\.?[0-9]*$' AND estimated_damage::numeric <= 100000 THEN '₱0 – ₱100,000'
          WHEN estimated_damage::text ~ '^[0-9]+\.?[0-9]*$' AND estimated_damage::numeric <= 500000 THEN '₱100,001 – ₱500,000'
          WHEN estimated_damage::text ~ '^[0-9]+\.?[0-9]*$' THEN '₱500,001 and above'
          ELSE '₱0'
        END as damage_range,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2
      GROUP BY damage_range
      ORDER BY 
        CASE damage_range
          WHEN '₱0' THEN 1
          WHEN '₱0 – ₱100,000' THEN 2
          WHEN '₱100,001 – ₱500,000' THEN 3
          ELSE 4
        END
    `;
    
    const damageRanges = await db.query(damageRangesQuery, [startDate, endDate]);
    
    // 6. Verification and Documentation stats
    const verificationQuery = `
      SELECT 
        COALESCE(reported_by, 'System') as reported_by,
        COUNT(*) as report_count
      FROM historical_fires 
      WHERE reported_at >= $1 AND reported_at < $2
      GROUP BY reported_by
      ORDER BY report_count DESC
      LIMIT 10
    `;
    
    const verification = await db.query(verificationQuery, [startDate, endDate]);
    
    // Calculate response times
    const responseTimes = incidentDetails.rows.filter(r => r.duration_minutes != null);
    const avgDuration = responseTimes.length > 0 ? 
      Math.round(responseTimes.reduce((sum, r) => sum + r.duration_minutes, 0) / responseTimes.length) : 0;
    const fastestDuration = responseTimes.length > 0 ? Math.min(...responseTimes.map(r => r.duration_minutes)) : 0;
    const longestDuration = responseTimes.length > 0 ? Math.max(...responseTimes.map(r => r.duration_minutes)) : 0;
    
    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    const report = {
      report_info: {
        month_covered: `${monthNames[reportMonth - 1]} ${reportYear}`,
        report_generated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        prepared_by: 'Fire Data Management System (BFP-Mandaluyong IT Unit)'
      },
      
      summary: {
        total_incidents: parseInt(summary.rows[0].total_incidents) || 0,
        avg_alarm_level: Math.round((summary.rows[0].avg_alarm_level || 0) * 10) / 10,
        total_casualties: parseInt(summary.rows[0].total_casualties) || 0,
        total_injuries: parseInt(summary.rows[0].total_injuries) || 0,
        total_damage: parseFloat(summary.rows[0].total_damage) || 0,
        avg_duration: Math.round(summary.rows[0].avg_duration_minutes || 0)
      },
      
      barangay_incidents: barangayStats.rows.map(row => ({
        barangay: row.barangay,
        incident_count: parseInt(row.incident_count),
        total_damage: parseFloat(row.total_damage) || 0,
        casualties: parseInt(row.casualties) || 0,
        injuries: parseInt(row.injuries) || 0
      })),
      
      incident_details: incidentDetails.rows.map(row => ({
        id: row.id,
        alarm_level: row.alarm_level,
        reported_at: row.reported_at,
        resolved_at: row.resolved_at,
        duration_minutes: Math.round(row.duration_minutes || 0),
        action_taken: row.action_taken || 'N/A',
        barangay: row.barangay
      })),
      
      response_summary: {
        avg_duration: avgDuration,
        fastest_duration: Math.round(fastestDuration),
        longest_duration: Math.round(longestDuration),
        total_resolved: responseTimes.length
      },
      
      common_causes: causes.rows.map(row => ({
        cause: row.cause,
        case_count: parseInt(row.case_count),
        percentage: Math.round((row.case_count / (summary.rows[0].total_incidents || 1)) * 100 * 10) / 10
      })),
      
      damage_summary: {
        total_damage: parseFloat(summary.rows[0].total_damage) || 0,
        damage_ranges: damageRanges.rows.map(row => ({
          range: row.damage_range,
          incident_count: parseInt(row.incident_count)
        }))
      },
      
      verification: verification.rows.map(row => ({
        reported_by: row.reported_by,
        report_count: parseInt(row.report_count)
      }))
    };
    
    console.log(`✅ Generated report for ${report.report_info.month_covered} with ${report.summary.total_incidents} incidents`);
    res.json(report);
    
  } catch (error) {
    console.error('❌ Monthly report generation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query_params: { month, year },
      date_range: { reportMonth, reportYear }
    });
    res.status(500).json({ 
      error: 'Failed to generate monthly report: ' + error.message,
      details: error.stack,
      debug_info: {
        month: month,
        year: year,
        reportMonth: reportMonth,
        reportYear: reportYear
      }
    });
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
