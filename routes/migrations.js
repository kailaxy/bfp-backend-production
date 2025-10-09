const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const authenticateJWT = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

/**
 * POST /api/migrations/run
 * Run database migration (Admin only)
 */
router.post('/run', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { migrationName } = req.body;
    
    if (!migrationName) {
      return res.status(400).json({ 
        error: 'Migration name is required',
        available: ['add_model_used_to_forecasts']
      });
    }

    console.log(`📊 Running migration: ${migrationName}`);
    
    const migrationPath = path.join(__dirname, '../migrations', `${migrationName}.sql`);
    
    // Check if migration file exists
    try {
      await fs.access(migrationPath);
    } catch (err) {
      return res.status(404).json({ 
        error: 'Migration file not found',
        path: migrationPath
      });
    }
    
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    await db.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes for add_model_used_to_forecasts
    if (migrationName === 'add_model_used_to_forecasts') {
      const checkQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'forecasts' 
        AND column_name IN ('model_used', 'confidence_interval')
        ORDER BY column_name;
      `;
      
      const result = await db.query(checkQuery);
      
      return res.json({
        success: true,
        message: 'Migration completed successfully',
        migration: migrationName,
        verification: {
          columns_added: result.rows
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      migration: migrationName
    });
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    res.status(500).json({ 
      error: 'Migration failed',
      details: err.message 
    });
  }
});

/**
 * GET /api/migrations/status
 * Check migration status (Admin only)
 */
router.get('/status', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const checkQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'forecasts'
      ORDER BY ordinal_position;
    `;
    
    const result = await db.query(checkQuery);
    
    const hasModelUsed = result.rows.some(row => row.column_name === 'model_used');
    const hasConfidenceInterval = result.rows.some(row => row.column_name === 'confidence_interval');
    
    res.json({
      table: 'forecasts',
      columns: result.rows,
      migration_status: {
        model_used_column: hasModelUsed ? 'exists' : 'missing',
        confidence_interval_column: hasConfidenceInterval ? 'exists' : 'missing',
        ready_for_enhanced_forecasting: hasModelUsed && hasConfidenceInterval
      }
    });
    
  } catch (err) {
    console.error('❌ Error checking migration status:', err);
    res.status(500).json({ 
      error: 'Failed to check migration status',
      details: err.message 
    });
  }
});

module.exports = router;
