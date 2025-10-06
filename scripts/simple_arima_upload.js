#!/usr/bin/env node

/**
 * Simple script to generate ARIMA forecasts locally and upload to Render database
 * Uses existing historical data files and Python ARIMA script
 */

require('dotenv').config();
const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Production database connection
const productionPool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateAndUploadToRender() {
  console.log('🚀 GENERATING REAL ARIMA FORECASTS AND UPLOADING TO RENDER...');
  
  try {
    // Step 1: Generate forecasts using Python ARIMA script
    console.log('🐍 Generating forecasts with Python ARIMA...');
    
    const inputFile = path.join(__dirname, '../forecasting/monthly_input.json');
    const outputFile = path.join(__dirname, '../forecasting/render_upload.json');
    
    // Run Python ARIMA script
    const pythonResult = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('py', [
        path.join(__dirname, '../forecasting/arima_forecast_12months.py'),
        inputFile,
        outputFile
      ], {
        cwd: path.join(__dirname, '../forecasting')
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('   🐍', output.trim());
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });
    });

    // Step 2: Read generated forecasts
    console.log('📊 Reading generated forecasts...');
    const forecastData = JSON.parse(await fs.readFile(outputFile, 'utf8'));
    
    // Flatten the forecasts from the monthly structure
    const allForecasts = [];
    for (const monthKey in forecastData.forecasts_by_month) {
      allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
    }
    
    console.log(`✅ Generated ${allForecasts.length} forecasts for ${Object.keys(forecastData.forecasts_by_month).length} months`);

    // Step 3: Upload to Render database
    console.log('📤 Connecting to Render database...');
    
    // Clear existing forecasts for the next 12 months
    console.log('🧹 Clearing existing synthetic forecasts...');
    
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      const deleteResult = await productionPool.query(
        'DELETE FROM forecasts WHERE year = $1 AND month = $2',
        [year, month]
      );
      console.log(`   Cleared ${deleteResult.rowCount} forecasts for ${year}-${month.toString().padStart(2, '0')}`);
    }

    // Step 4: Upload new ARIMA forecasts
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

    for (const forecast of allForecasts) {
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
        }

        await productionPool.query(uploadQuery, [
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
        
        if (uploadedCount % 20 === 0) {
          console.log(`   📈 Uploaded ${uploadedCount}/${allForecasts.length} forecasts...`);
        }
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload forecast for ${forecast.barangay_name} ${forecast.year}-${forecast.month}:`, uploadError.message);
        failedCount++;
      }
    }

    console.log(`\n🎉 UPLOAD COMPLETE!`);
    console.log(`✅ Successfully uploaded: ${uploadedCount} real ARIMA forecasts`);
    console.log(`❌ Failed uploads: ${failedCount} forecasts`);

    // Step 5: Verify upload
    const verifyResult = await productionPool.query('SELECT COUNT(*) as count FROM forecasts');
    console.log(`📊 Total forecasts in Render database: ${verifyResult.rows[0].count}`);

    // Show sample data
    const sampleResult = await productionPool.query(`
      SELECT barangay_name, month, year, predicted_cases, risk_level, risk_flag 
      FROM forecasts 
      ORDER BY year, month, barangay_name 
      LIMIT 10
    `);

    console.log('\n📋 Sample uploaded ARIMA forecasts:');
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.barangay_name} ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.predicted_cases} cases (${row.risk_level}, Alert: ${row.risk_flag})`);
    });

    console.log('\n🚀 SUCCESS! Render database now has real ARIMA forecasts!');
    console.log('🗺️ Your deployed frontend will now show authentic fire risk predictions.');

    // Clean up
    await fs.unlink(outputFile).catch(() => {}); // Remove temp file
    
  } catch (error) {
    console.error('❌ Error in forecast generation/upload:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await productionPool.end();
  }
}

if (require.main === module) {
  generateAndUploadToRender();
}

module.exports = { generateAndUploadToRender };