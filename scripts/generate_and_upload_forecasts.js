#!/usr/bin/env node

/**
 * Generate forecasts locally using Python ARIMA, then upload to production database
 * This bypasses Render's Python limitations by doing the heavy computation locally
 */

require('dotenv').config();
const { Pool } = require('pg');
const Multi12MonthForecastingService = require('../services/multi12MonthForecastingService');

// Production database connection
const productionPool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateAndUploadForecasts() {
  const service = new Multi12MonthForecastingService();
  
  try {
    console.log('🚀 GENERATING FORECASTS LOCALLY WITH PYTHON...');
    console.log('📅 Target: October 2025 → September 2026');
    
    // Generate forecasts locally using Python ARIMA
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth() + 1;
    
    console.log('🐍 Using local Python environment for ARIMA forecasting...');
    const results = await service.generate12MonthForecasts(startYear, startMonth);
    
    console.log(`✅ Generated ${results.total_predictions} ARIMA forecasts locally`);
    console.log(`📊 Coverage: ${results.barangays_count} barangays over ${results.total_months} months`);
    
    // Now upload to production database
    console.log('\n📤 UPLOADING TO PRODUCTION DATABASE...');
    
    // First clear existing forecasts in production
    console.log('🧹 Clearing existing forecasts in production database...');
    
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const currentDate = new Date(startYear, startMonth - 1 + monthOffset, 1);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const deleteResult = await productionPool.query(
        'DELETE FROM forecasts WHERE year = $1 AND month = $2',
        [year, month]
      );
      console.log(`   Cleared ${deleteResult.rowCount} forecasts for ${year}-${month.toString().padStart(2, '0')}`);
    }
    
    // Upload new forecasts
    console.log('\n💾 Uploading new ARIMA forecasts to production...');
    
    const uploadQuery = `
      INSERT INTO forecasts (
        barangay_name, month, year, predicted_cases, 
        lower_bound, upper_bound, risk_level, risk_flag, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
    
    let uploadedCount = 0;
    let failedCount = 0;
    
    for (const forecast of results.all_forecasts) {
      try {
        // Convert risk_flag to boolean if it's a string
        let riskFlag = forecast.risk_flag;
        if (typeof riskFlag === 'string') {
          riskFlag = riskFlag === 'Elevated Risk' || riskFlag === 'Watchlist';
        }
        
        await productionPool.query(uploadQuery, [
          forecast.barangay_name,
          forecast.month,
          forecast.year,
          forecast.predicted_cases,
          forecast.lower_bound,
          forecast.upper_bound,
          forecast.risk_level,
          riskFlag
        ]);
        
        uploadedCount++;
        
        if (uploadedCount % 50 === 0) {
          console.log(`   📈 Uploaded ${uploadedCount}/${results.all_forecasts.length} forecasts...`);
        }
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload forecast for ${forecast.barangay_name} ${forecast.year}-${forecast.month}:`, uploadError.message);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 UPLOAD COMPLETE!`);
    console.log(`✅ Successfully uploaded: ${uploadedCount} forecasts`);
    console.log(`❌ Failed uploads: ${failedCount} forecasts`);
    
    // Verify upload
    const verifyResult = await productionPool.query('SELECT COUNT(*) as count FROM forecasts');
    console.log(`📊 Total forecasts in production database: ${verifyResult.rows[0].count}`);
    
    // Show some sample data
    const sampleResult = await productionPool.query(`
      SELECT barangay_name, month, year, predicted_cases, risk_level, risk_flag 
      FROM forecasts 
      ORDER BY year, month, barangay_name 
      LIMIT 10
    `);
    
    console.log('\n📋 Sample uploaded forecasts:');
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.barangay_name} ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.predicted_cases} cases (${row.risk_level}, Alert: ${row.risk_flag})`);
    });
    
    console.log('\n🚀 Production database now has real ARIMA forecasts!');
    console.log('🗺️ Frontend should now display fire risk predictions correctly.');
    
  } catch (error) {
    console.error('❌ Error in forecast generation/upload:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await productionPool.end();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  generateAndUploadForecasts();
}

module.exports = { generateAndUploadForecasts };