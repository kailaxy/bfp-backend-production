const express = require('express');
const router = express.Router();
const db = require('../db');
const forecastingService = require('../services/forecastingService');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

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

module.exports = router;