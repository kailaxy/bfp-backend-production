// Temporary API upload endpoint for ARIMA forecasts
// This adds a route to your server that can receive the JSON data and insert it

module.exports = function addUploadEndpoint(app, pool) {
  // Add this route to your server temporarily
  app.post('/api/upload-arima-forecasts', async (req, res) => {
    try {
      console.log('📊 ARIMA upload endpoint called, data length:', req.body?.forecasts?.length || 'no data');
      
      const { forecasts } = req.body;
      if (!Array.isArray(forecasts)) {
        return res.status(400).json({ error: 'Forecasts array required' });
      }

      console.log('🔄 Starting batch insert of', forecasts.length, 'forecasts...');
      
      // Start transaction
      const client = await pool.connect();
      await client.query('BEGIN');

      try {
        // Clear existing ARIMA forecasts (optional - comment out if you want to keep existing)
        await client.query('DELETE FROM arima_forecasts');
        console.log('🗑️  Cleared existing ARIMA forecasts');

        // Insert all forecasts
        let insertCount = 0;
        for (const forecast of forecasts) {
          const query = `
            INSERT INTO arima_forecasts (
              barangay_name, month_year, predicted_fires, 
              risk_level, created_at, model_version
            ) VALUES ($1, $2, $3, $4, NOW(), $5)
          `;
          
          await client.query(query, [
            forecast.barangay_name,
            forecast.month_year, 
            forecast.predicted_fires,
            forecast.risk_level,
            'comprehensive_12month_v1'
          ]);
          insertCount++;
        }

        await client.query('COMMIT');
        console.log('✅ Successfully uploaded', insertCount, 'ARIMA forecasts');

        // Get verification count
        const verification = await client.query('SELECT COUNT(*) as count FROM arima_forecasts');
        
        res.json({ 
          success: true, 
          message: `Successfully uploaded ${insertCount} ARIMA forecasts`,
          total_in_database: parseInt(verification.rows[0].count)
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ ARIMA upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed: ' + error.message 
      });
    }
  });

  console.log('📡 Temporary ARIMA upload endpoint added: POST /api/upload-arima-forecasts');
};