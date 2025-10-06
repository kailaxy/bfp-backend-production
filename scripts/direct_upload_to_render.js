#!/usr/bin/env node

/**
 * Direct upload script for ARIMA forecasts to Render database
 * This bypasses the need for console access by connecting directly
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function uploadForecastsDirectly() {
  console.log('🚀 UPLOADING ARIMA FORECASTS DIRECTLY TO RENDER DATABASE...');
  
  let pool;
  
  try {
    // Create connection with retry logic
    console.log('🔗 Connecting to Render PostgreSQL...');
    
    pool = new Pool({
      connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Connection pool settings for better reliability
      max: 1, // Use only 1 connection for free tier
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
    });

    // Test connection first
    console.log('🧪 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Connected successfully at: ${testResult.rows[0].current_time}`);

    // Read the generated forecasts
    console.log('📊 Reading ARIMA forecast data...');
    const forecastFile = path.join(__dirname, '../forecasting/all_barangays_output.json');
    const forecastData = JSON.parse(await fs.readFile(forecastFile, 'utf8'));
    
    // Flatten the forecasts from the monthly structure
    const allForecasts = [];
    for (const monthKey in forecastData.forecasts_by_month) {
      allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
    }
    
    console.log(`📈 Loaded ${allForecasts.length} ARIMA forecasts for upload`);

    // Step 1: Clear existing forecasts for the next 12 months
    console.log('🧹 Clearing existing synthetic forecasts...');
    
    const now = new Date();
    let totalCleared = 0;
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      try {
        const deleteResult = await pool.query(
          'DELETE FROM forecasts WHERE year = $1 AND month = $2',
          [year, month]
        );
        totalCleared += deleteResult.rowCount;
        console.log(`   ✓ Cleared ${deleteResult.rowCount} forecasts for ${year}-${month.toString().padStart(2, '0')}`);
      } catch (deleteError) {
        console.log(`   ⚠️ Could not clear ${year}-${month}: ${deleteError.message}`);
      }
    }
    
    console.log(`🗑️ Total synthetic forecasts cleared: ${totalCleared}`);

    // Step 2: Upload new ARIMA forecasts in batches
    console.log('💾 Uploading real ARIMA forecasts...');
    
    const uploadQuery = `
      INSERT INTO forecasts (
        barangay_name, month, year, predicted_cases, 
        lower_bound, upper_bound, risk_level, risk_flag, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    let uploadedCount = 0;
    let failedCount = 0;
    const batchSize = 10; // Upload in small batches for free tier

    console.log(`📦 Processing ${allForecasts.length} forecasts in batches of ${batchSize}...`);

    for (let i = 0; i < allForecasts.length; i += batchSize) {
      const batch = allForecasts.slice(i, i + batchSize);
      
      for (const forecast of batch) {
        try {
          // Determine risk level and flag based on predicted cases
          let riskLevel = 'Low';
          let riskFlag = false;
          
          if (forecast.predicted_cases >= 5) {
            riskLevel = 'High';
            riskFlag = true;
          } else if (forecast.predicted_cases >= 2) {
            riskLevel = 'Medium';
            riskFlag = false;
          } else if (forecast.predicted_cases >= 1) {
            riskLevel = 'Low';
            riskFlag = false;
          }

          await pool.query(uploadQuery, [
            forecast.barangay_name,
            forecast.month,
            forecast.year,
            Math.round(forecast.predicted_cases * 100) / 100, // Round to 2 decimals
            Math.round(forecast.lower_bound * 100) / 100,
            Math.round(forecast.upper_bound * 100) / 100,
            riskLevel,
            riskFlag
          ]);
          
          uploadedCount++;
          
        } catch (uploadError) {
          console.error(`❌ Failed to upload forecast for ${forecast.barangay_name} ${forecast.year}-${forecast.month}:`, uploadError.message);
          failedCount++;
        }
      }
      
      // Progress update
      console.log(`   📈 Uploaded batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(allForecasts.length / batchSize)} (${uploadedCount} total)`);
      
      // Small delay between batches to be gentle on free tier
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 UPLOAD COMPLETE!`);
    console.log(`✅ Successfully uploaded: ${uploadedCount} real ARIMA forecasts`);
    console.log(`❌ Failed uploads: ${failedCount} forecasts`);

    // Step 3: Verify upload
    console.log('\n🔍 Verifying upload...');
    const verifyResult = await pool.query('SELECT COUNT(*) as count FROM forecasts');
    console.log(`📊 Total forecasts in Render database: ${verifyResult.rows[0].count}`);

    // Show sample data by barangay
    const sampleResult = await pool.query(`
      SELECT barangay_name, COUNT(*) as forecast_count
      FROM forecasts 
      GROUP BY barangay_name 
      ORDER BY barangay_name 
      LIMIT 10
    `);

    console.log('\n📋 Sample forecasts by barangay:');
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.barangay_name}: ${row.forecast_count} months of forecasts`);
    });

    console.log('\n🚀 SUCCESS! Render database now has real ARIMA forecasts for all barangays!');
    console.log('🗺️ Your deployed frontend will now show authentic fire risk predictions.');
    
  } catch (error) {
    console.error('❌ Error in direct upload:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  uploadForecastsDirectly();
}

module.exports = { uploadForecastsDirectly };