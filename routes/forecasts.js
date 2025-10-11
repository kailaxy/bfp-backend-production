const express = require('express');
const router = express.Router();
const db = require('../config/db');
const forecastingService = require('../services/forecastingService');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

/**
 * GET /api/forecasts/arima/all
 * Get all ARIMA forecasts grouped by barangay (Admin only)
 * NOTE: This route MUST be before /:year/:month to avoid path collision
 */
router.get('/arima/all', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Get current year and month for filtering
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const query = `
      SELECT 
        barangay_name as barangay,
        year || '-' || LPAD(month::text, 2, '0') || '-01' as forecast_month,
        predicted_cases,
        lower_bound,
        upper_bound,
        risk_level,
        COALESCE(model_used, 'ARIMA (legacy)') as model_used,
        created_at
      FROM forecasts
      WHERE (year > $1) OR (year = $1 AND month >= $2)
      ORDER BY barangay_name, year, month
    `;

    const result = await db.query(query, [currentYear, currentMonth]);

    // Get the most recent created_at timestamp
    const lastUpdatedQuery = `
      SELECT MAX(created_at) as last_updated
      FROM forecasts
    `;
    const lastUpdatedResult = await db.query(lastUpdatedQuery);
    const lastUpdated = lastUpdatedResult.rows[0]?.last_updated;

    // Group by barangay
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.barangay]) {
        grouped[row.barangay] = {
          barangay: row.barangay,
          forecasts: []
        };
      }
      grouped[row.barangay].forecasts.push({
        month: row.forecast_month,
        predicted_cases: parseFloat(row.predicted_cases),
        lower_bound: parseFloat(row.lower_bound),
        upper_bound: parseFloat(row.upper_bound),
        risk_level: row.risk_level,
        model_used: row.model_used
      });
    });

    const barangays = Object.values(grouped);

    res.json({
      barangays,
      total: barangays.length,
      last_updated: lastUpdated
    });

  } catch (error) {
    console.error('❌ Error fetching ARIMA forecasts:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    // Check if it's a table not found error
    if (error.code === '42P01') {
      return res.status(200).json({
        barangays: [],
        total: 0,
        last_updated: null,
        message: 'ARIMA forecasts table not found. Please generate forecasts first.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch ARIMA forecasts',
      details: error.message 
    });
  }
});

/**
 * GET /api/forecasts/:year/:month
 * Get fire risk forecasts for a specific month/year
 */
router.get('/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        error: 'Invalid year or month. Month must be 1-12.' 
      });
    }

    const query = `
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
      WHERE year = $1 AND month = $2
      ORDER BY barangay_name
    `;

    const result = await db.query(query, [yearNum, monthNum]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: `No forecasts found for ${year}-${month.toString().padStart(2, '0')}` 
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch forecasts' });
  }
});

/**
 * GET /api/forecasts/latest
 * Get the most recent forecasts available
 */
router.get('/latest', async (req, res) => {
  try {
    const query = `
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
      WHERE (year, month) = (
        SELECT year, month 
        FROM forecasts 
        ORDER BY year DESC, month DESC 
        LIMIT 1
      )
      ORDER BY barangay_name
    `;

    const result = await db.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No forecasts available' 
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching latest forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch latest forecasts' });
  }
});

/**
 * POST /api/forecasts/generate
 * Generate new forecasts for a specific month/year (Admin only)
 */
router.post('/generate', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.body;
    
    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        error: 'Invalid year or month. Month must be 1-12.' 
      });
    }

    // Validate that we're not generating forecasts for past months
    const now = new Date();
    const targetDate = new Date(yearNum, monthNum - 1, 1);
    
    if (targetDate <= now) {
      return res.status(400).json({ 
        error: 'Cannot generate forecasts for past or current months' 
      });
    }

    // Generate forecasts
    const forecasts = await forecastingService.generateMonthlyForecasts(yearNum, monthNum);
    
    res.json({
      message: `Successfully generated forecasts for ${forecasts.length} barangays`,
      forecasts: forecasts,
      targetMonth: `${yearNum}-${monthNum.toString().padStart(2, '0')}`
    });

  } catch (error) {
    console.error('Error generating forecasts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate forecasts' 
    });
  }
});

/**
 * POST /api/forecasts/generate-12months
 * Generate 12 months of forecasts starting from current month (Admin only)
 */
router.post('/generate-12months', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { startYear, startMonth } = req.body;
    
    // Use current month if not specified
    const now = new Date();
    const targetYear = startYear ? parseInt(startYear) : now.getFullYear();
    const targetMonth = startMonth ? parseInt(startMonth) : (now.getMonth() + 1);
    
    // Validate parameters
    if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ 
        error: 'Invalid year or month. Month must be 1-12.' 
      });
    }

    console.log(`Admin requested 12-month forecast generation from ${targetYear}-${targetMonth.toString().padStart(2, '0')}`);
    
    // Import the 12-month forecasting service
    const multi12MonthForecastingService = require('../services/multi12MonthForecastingService');
    
    // Generate 12 months of forecasts
    const results = await multi12MonthForecastingService.generateAndSave12MonthForecasts(targetYear, targetMonth);
    
    res.json({
      message: 'Successfully generated 12 months of forecasts',
      results: results,
      startMonth: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
      endMonth: `${targetYear + Math.floor((targetMonth + 10) / 12)}-${((targetMonth + 10) % 12 + 1).toString().padStart(2, '0')}`
    });

  } catch (error) {
    console.error('Error generating 12-month forecasts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate 12-month forecasts' 
    });
  }
});

/**
 * GET /api/forecasts/barangay/:name
 * Get forecast history for a specific barangay
 */
router.get('/barangay/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 12 } = req.query; // Default to last 12 months
    
    const query = `
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
      WHERE barangay_name ILIKE $1
      ORDER BY year DESC, month DESC
      LIMIT $2
    `;

    const result = await db.query(query, [name, parseInt(limit)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: `No forecasts found for barangay: ${name}` 
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching barangay forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch barangay forecasts' });
  }
});

/**
 * DELETE /api/forecasts/:year/:month
 * Delete forecasts for a specific month/year (Admin only)
 */
router.delete('/:year/:month', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        error: 'Invalid year or month. Month must be 1-12.' 
      });
    }

    const deleteQuery = `
      DELETE FROM forecasts 
      WHERE year = $1 AND month = $2
    `;

    const result = await db.query(deleteQuery, [yearNum, monthNum]);
    
    res.json({
      message: `Deleted ${result.rowCount} forecasts for ${year}-${month.toString().padStart(2, '0')}`,
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error('Error deleting forecasts:', error);
    res.status(500).json({ error: 'Failed to delete forecasts' });
  }
});

/**
 * DELETE /api/forecasts/clear
 * Clear all forecasts from database (Admin only)
 */
router.delete('/clear', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️  Clearing all forecasts...');
    const result = await db.query('DELETE FROM forecasts');
    console.log(`✅ Cleared ${result.rowCount} forecast records`);
    
    res.json({
      success: true,
      message: `Cleared ${result.rowCount} forecast records`,
      cleared_count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error clearing forecasts:', error);
    res.status(500).json({
      error: 'Failed to clear forecasts',
      details: error.message
    });
  }
});

/**
 * POST /api/forecasts/generate-enhanced
 * Generate forecasts using enhanced ARIMA/SARIMAX models (Admin only)
 * This uses the improved Colab-based forecasting system
 */
router.post('/generate-enhanced', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const enhancedForecastService = require('../services/enhancedForecastService');
    
    const { 
      forecastMonths = 13, // 13 months to include both start and end month (Oct 2025 - Oct 2026)
      targetDate = null,
      keepTempFiles = false 
    } = req.body;

    console.log(`🚀 Enhanced forecast generation requested by ${req.user.username}`);
    console.log(`   Forecast months: ${forecastMonths}`);
    console.log(`   Target date: ${targetDate || 'auto'}`);

    // Generate forecasts
    const result = await enhancedForecastService.generateForecasts({
      forecastMonths,
      targetDate,
      keepTempFiles
    });

    res.json({
      message: 'Enhanced forecasts generated successfully',
      ...result
    });

  } catch (error) {
    console.error('❌ Error in enhanced forecast generation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate enhanced forecasts',
      details: error.stack
    });
  }
});

/**
 * GET /api/forecasts/models/summary
 * Get summary of models used for each barangay (Admin only)
 */
router.get('/models/summary', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        barangay,
        model_used,
        COUNT(*) as forecast_count,
        MIN(forecast_month) as earliest_forecast,
        MAX(forecast_month) as latest_forecast,
        AVG(predicted_cases) as avg_predicted_cases
      FROM arima_forecasts
      GROUP BY barangay, model_used
      ORDER BY barangay, model_used
    `;

    const result = await db.query(query);

    res.json({
      models: result.rows,
      total_barangays: new Set(result.rows.map(r => r.barangay)).size
    });

  } catch (error) {
    console.error('Error fetching models summary:', error);
    res.status(500).json({ error: 'Failed to fetch models summary' });
  }
});

/**
 * GET /api/forecasts/graphs/:barangay
 * Get graph visualization data for a specific barangay
 * Returns 6 datasets: actual, fitted, forecast, ci_lower, ci_upper, moving_avg_6
 */
router.get('/graphs/:barangay', authenticateJWT, async (req, res) => {
  try {
    const { barangay } = req.params;
    
    console.log(`📊 Fetching graph data for barangay: ${barangay}`);
    
    // Query all graph data for the barangay
    const query = `
      SELECT 
        record_type,
        date,
        value
      FROM forecasts_graphs
      WHERE barangay = $1
      ORDER BY date ASC, record_type
    `;
    
    const result = await db.query(query, [barangay]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No graph data found for barangay: ${barangay}`,
        hint: 'Generate forecasts first to populate graph data'
      });
    }
    
    // Group data by record_type for easier frontend consumption
    const graphData = {
      actual: [],
      fitted: [],
      forecast: [],
      ci_lower: [],
      ci_upper: [],
      moving_avg_6: []
    };
    
    result.rows.forEach(row => {
      const dataPoint = {
        date: row.date,
        value: parseFloat(row.value)
      };
      
      if (graphData[row.record_type]) {
        graphData[row.record_type].push(dataPoint);
      }
    });
    
    // Calculate metadata
    const metadata = {
      barangay,
      total_records: result.rows.length,
      date_range: {
        start: result.rows[0]?.date,
        end: result.rows[result.rows.length - 1]?.date
      },
      datasets: {
        actual: graphData.actual.length,
        fitted: graphData.fitted.length,
        forecast: graphData.forecast.length,
        ci_lower: graphData.ci_lower.length,
        ci_upper: graphData.ci_upper.length,
        moving_avg_6: graphData.moving_avg_6.length
      }
    };
    
    console.log(`✅ Retrieved ${result.rows.length} graph records for ${barangay}`);
    
    res.json({
      success: true,
      barangay,
      data: graphData,
      metadata
    });
    
  } catch (error) {
    console.error('❌ Error fetching graph data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch graph data: ' + error.message
    });
  }
});

/**
 * POST /api/forecasts/migrate-graph-table
 * Create forecasts_graphs table for graph visualization (Admin only, one-time setup)
 */
router.post('/migrate-graph-table', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Running forecasts_graphs table migration...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Read SQL migration file
    const sqlPath = path.join(__dirname, '../migrations/create_forecasts_graphs_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await db.query(sql);
    
    // Verify table creation
    const verifyResult = await db.query(`
      SELECT COUNT(*) as exists 
      FROM information_schema.tables 
      WHERE table_name = 'forecasts_graphs'
    `);
    
    const tableExists = verifyResult.rows[0].exists > 0;
    
    if (tableExists) {
      // Get table structure
      const structureResult = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'forecasts_graphs'
        ORDER BY ordinal_position
      `);
      
      console.log('✅ Migration completed successfully');
      res.json({
        success: true,
        message: 'forecasts_graphs table created successfully',
        table_structure: structureResult.rows
      });
    } else {
      throw new Error('Table creation verification failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Migration failed: ' + error.message 
    });
  }
});

module.exports = router;