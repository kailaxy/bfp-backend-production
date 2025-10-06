/**
 * Manual Forecast Data Insertion Script
 * This inserts sample forecast data directly into the database without Python
 * Use this as a temporary solution while Python dependencies are being resolved
 */

const db = require('../config/db');

async function insertSampleForecasts() {
  try {
    console.log('🚀 Inserting sample forecast data for October 2025...');
    
    // Get all barangays
    const barangays = await db.query('SELECT DISTINCT name FROM barangays ORDER BY name');
    console.log(`📍 Found ${barangays.rows.length} barangays`);
    
    if (barangays.rows.length === 0) {
      throw new Error('No barangays found in database');
    }
    
    // Clear existing forecasts for October 2025
    await db.query('DELETE FROM forecasts WHERE year = 2025 AND month = 10');
    console.log('🧹 Cleared existing October 2025 forecasts');
    
    // Generate sample forecasts for each barangay
    const forecasts = [];
    for (const barangay of barangays.rows) {
      // Generate random but realistic forecast data
      const predicted_cases = Math.random() * 2; // 0 to 2 cases
      const lower_bound = Math.max(0, predicted_cases - 0.5);
      const upper_bound = predicted_cases + 0.5;
      
      // Determine risk level
      let risk_level = 'Very Low';
      let risk_flag = 'Safe';
      
      if (predicted_cases >= 1) {
        risk_level = 'High';
        risk_flag = 'Alert';
      } else if (predicted_cases >= 0.5) {
        risk_level = 'Medium';
        risk_flag = 'Warning';
      } else if (predicted_cases >= 0.2) {
        risk_level = 'Low-Moderate';
        risk_flag = 'Caution';
      }
      
      forecasts.push({
        barangay_name: barangay.name,
        month: 10,
        year: 2025,
        predicted_cases: Math.round(predicted_cases * 1000) / 1000,
        lower_bound: Math.round(lower_bound * 1000) / 1000,
        upper_bound: Math.round(upper_bound * 1000) / 1000,
        risk_level,
        risk_flag
      });
    }
    
    // Insert forecasts
    console.log(`📊 Inserting ${forecasts.length} sample forecasts...`);
    
    for (const forecast of forecasts) {
      await db.query(`
        INSERT INTO forecasts (
          barangay_name, month, year, predicted_cases, 
          lower_bound, upper_bound, risk_level, risk_flag, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        forecast.barangay_name,
        forecast.month,
        forecast.year,
        forecast.predicted_cases,
        forecast.lower_bound,
        forecast.upper_bound,
        forecast.risk_level,
        forecast.risk_flag
      ]);
    }
    
    console.log('✅ Sample forecasts inserted successfully!');
    
    // Verify insertion
    const count = await db.query('SELECT COUNT(*) as count FROM forecasts WHERE year = 2025 AND month = 10');
    console.log(`🎯 Total October 2025 forecasts: ${count.rows[0].count}`);
    
    return {
      success: true,
      message: 'Sample forecasts generated successfully',
      count: parseInt(count.rows[0].count),
      month: '2025-10'
    };
    
  } catch (error) {
    console.error('❌ Failed to insert sample forecasts:', error);
    throw error;
  }
}

module.exports = { insertSampleForecasts };