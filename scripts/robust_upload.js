#!/usr/bin/env node

/**
 * Robust database upload with retry logic and multiple SSL configurations
 * This handles Render's free tier connection limitations better
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Multiple connection configurations to try
const connectionConfigs = [
  {
    name: 'SSL Prefer',
    config: {
      host: 'dpg-d35r1s211gvc73819f70-a.oregon-postgres.render.com',
      port: 5432,
      database: 'bfpmapping_nua2',
      user: 'bfpmapping_nua2_user',
      password: 'mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
      query_timeout: 60000,
    }
  },
  {
    name: 'SSL Required',
    config: {
      host: 'dpg-d35r1s211gvc73819f70-a.oregon-postgres.render.com',
      port: 5432,
      database: 'bfpmapping_nua2',
      user: 'bfpmapping_nua2_user',
      password: 'mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L',
      ssl: { rejectUnauthorized: false, sslmode: 'require' },
      connectionTimeoutMillis: 30000,
    }
  },
  {
    name: 'Connection String',
    config: {
      connectionString: 'postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s211gvc73819f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2?sslmode=prefer',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    }
  }
];

async function uploadWithRetry() {
  console.log('🚀 ATTEMPTING ROBUST UPLOAD TO RENDER DATABASE...');
  console.log('⏳ This may take several attempts due to Render free tier limitations...\n');

  for (let configIndex = 0; configIndex < connectionConfigs.length; configIndex++) {
    const { name, config } = connectionConfigs[configIndex];
    console.log(`🔄 Trying configuration: ${name}`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const client = new Client(config);
      
      try {
        console.log(`   Attempt ${attempt}/3 - Connecting...`);
        
        // Connect with timeout
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 30000)
          )
        ]);

        console.log('   ✅ Connected successfully!');
        
        // Test the connection
        console.log('   🧪 Testing connection...');
        const testResult = await client.query('SELECT NOW() as current_time, version() as db_version');
        console.log(`   📅 Database time: ${testResult.rows[0].current_time}`);
        
        // Now upload the forecasts
        console.log('   📊 Loading forecast data...');
        const forecastFile = path.join(__dirname, '../forecasting/all_barangays_output.json');
        const forecastData = JSON.parse(await fs.readFile(forecastFile, 'utf8'));
        
        // Flatten forecasts
        const allForecasts = [];
        for (const monthKey in forecastData.forecasts_by_month) {
          allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
        }
        
        console.log(`   📈 Processing ${allForecasts.length} forecasts...`);
        
        // Begin transaction
        await client.query('BEGIN');
        console.log('   🔒 Transaction started');
        
        // Clear existing forecasts
        console.log('   🧹 Clearing old forecasts...');
        const now = new Date();
        let totalCleared = 0;
        
        for (let i = 0; i < 12; i++) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth() + 1;
          
          const deleteResult = await client.query(
            'DELETE FROM forecasts WHERE year = $1 AND month = $2',
            [year, month]
          );
          totalCleared += deleteResult.rowCount;
        }
        
        console.log(`   🗑️  Cleared ${totalCleared} old forecasts`);
        
        // Insert new forecasts
        console.log('   💾 Inserting ARIMA forecasts...');
        
        const insertQuery = `
          INSERT INTO forecasts (
            barangay_name, month, year, predicted_cases, 
            lower_bound, upper_bound, risk_level, risk_flag, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `;
        
        let uploadedCount = 0;
        
        for (const forecast of allForecasts) {
          // Determine risk level
          let riskLevel = 'Very Low';
          let riskFlag = false;
          
          if (forecast.predicted_cases >= 2) {
            riskLevel = 'High';
            riskFlag = true;
          } else if (forecast.predicted_cases >= 1) {
            riskLevel = 'Medium';
            riskFlag = false;
          } else if (forecast.predicted_cases >= 0.5) {
            riskLevel = 'Low';
            riskFlag = false;
          }
          
          await client.query(insertQuery, [
            forecast.barangay_name,
            forecast.month,
            forecast.year,
            Math.round(forecast.predicted_cases * 100) / 100,
            Math.round(forecast.lower_bound * 100) / 100,
            Math.round(forecast.upper_bound * 100) / 100,
            riskLevel,
            riskFlag
          ]);
          
          uploadedCount++;
          
          if (uploadedCount % 50 === 0) {
            console.log(`     📊 Uploaded ${uploadedCount}/${allForecasts.length} forecasts...`);
          }
        }
        
        // Commit transaction
        await client.query('COMMIT');
        console.log('   ✅ Transaction committed');
        
        // Verify
        const verifyResult = await client.query('SELECT COUNT(*) as count FROM forecasts');
        console.log(`   📊 Total forecasts in database: ${verifyResult.rows[0].count}`);
        
        console.log(`\n🎉 SUCCESS! ARIMA forecasts uploaded successfully!`);
        console.log(`✅ Configuration: ${name}`);
        console.log(`📈 Uploaded: ${uploadedCount} real ARIMA forecasts`);
        console.log(`🏘️  Covering: All 27 barangays`);
        console.log(`📅 Period: October 2025 - September 2026`);
        
        await client.end();
        return true;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
        
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // Ignore rollback errors
        }
        
        try {
          await client.end();
        } catch (endError) {
          // Ignore connection end errors
        }
        
        if (attempt < 3) {
          console.log(`   ⏳ Waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    console.log(`   💀 Configuration ${name} failed after 3 attempts\n`);
  }
  
  console.log('❌ All connection methods failed. Possible reasons:');
  console.log('   • Render database is sleeping (common on free tier)');
  console.log('   • Network connectivity issues');
  console.log('   • Database connection limits reached');
  console.log('\n💡 Suggestions:');
  console.log('   • Wait 10-15 minutes and try again');
  console.log('   • Try during off-peak hours');
  console.log('   • Contact Render support about connection issues');
  
  return false;
}

if (require.main === module) {
  uploadWithRetry();
}

module.exports = { uploadWithRetry };