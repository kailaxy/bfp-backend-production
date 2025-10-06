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
const schedulerService        = require('./services/schedulerService');

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

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 BFP Backend Server started successfully!`);
  console.log(`📍 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for frontend origins`);
  
  // Start the monthly forecasting scheduler
  try {
    schedulerService.start();
    console.log('📅 Monthly forecasting scheduler started successfully');
  } catch (error) {
    console.error('⚠️  Failed to start forecasting scheduler:', error.message);
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
