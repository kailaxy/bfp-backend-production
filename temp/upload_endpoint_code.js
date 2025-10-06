// Add this route to your server.js temporarily for bulk upload

app.post('/api/upload-arima-forecasts', async (req, res) => {
  console.log('🚀 Bulk ARIMA forecast upload started...');
  
  try {
    const { forecasts } = req.body;
    
    if (!forecasts || !Array.isArray(forecasts)) {
      return res.status(400).json({ error: 'Invalid forecasts data' });
    }
    
    console.log(`📊 Uploading ${forecasts.length} forecasts...`);
    
    // Clear existing forecasts for 2025-2026
    console.log('🧹 Clearing existing forecasts...');
    const deleteResult = await db.query(
      'DELETE FROM forecasts WHERE year >= 2025 AND year <= 2026'
    );
    console.log(`Cleared ${deleteResult.rowCount} existing forecasts`);
    
    // Batch insert forecasts
    const batchSize = 50;
    let uploaded = 0;
    
    for (let i = 0; i < forecasts.length; i += batchSize) {
      const batch = forecasts.slice(i, i + batchSize);
      
      const insertQuery = `
        INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at)
        VALUES ` + batch.map((_, index) => 
          `($${index * 9 + 1}, $${index * 9 + 2}, $${index * 9 + 3}, $${index * 9 + 4}, $${index * 9 + 5}, $${index * 9 + 6}, $${index * 9 + 7}, $${index * 9 + 8}, NOW())`
        ).join(', ');
      
      const values = [];
      batch.forEach(forecast => {
        let riskLevel = 'Very Low';
        let riskFlag = false;
        
        if (forecast.predicted_cases >= 2) {
          riskLevel = 'High';
          riskFlag = true;
        } else if (forecast.predicted_cases >= 1) {
          riskLevel = 'Medium';
        } else if (forecast.predicted_cases >= 0.5) {
          riskLevel = 'Low';
        }
        
        values.push(
          forecast.barangay_name,
          forecast.month,
          forecast.year,
          Math.round(forecast.predicted_cases * 100) / 100,
          Math.round(forecast.lower_bound * 100) / 100,
          Math.round(forecast.upper_bound * 100) / 100,
          riskLevel,
          riskFlag
        );
      });
      
      await db.query(insertQuery, values);
      uploaded += batch.length;
      console.log(`📈 Uploaded ${uploaded}/${forecasts.length} forecasts...`);
    }
    
    // Verify results
    const verifyResult = await db.query('SELECT COUNT(*) as count FROM forecasts WHERE year >= 2025');
    
    console.log(`🎉 Upload complete! ${verifyResult.rows[0].count} ARIMA forecasts in database`);
    
    res.json({
      success: true,
      uploaded: uploaded,
      total_in_db: verifyResult.rows[0].count,
      message: 'ARIMA forecasts uploaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});