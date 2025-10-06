#!/usr/bin/env node

/**
 * Generate SQL INSERT statements for uploading ARIMA forecasts to Render database
 * This creates a SQL file you can copy/paste into Render's database console
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function generateSQLForRender() {
  console.log('🚀 GENERATING ARIMA FORECASTS AND SQL INSERT STATEMENTS...');
  
  try {
    // Step 1: Generate forecasts using Python ARIMA script
    console.log('🐍 Generating forecasts with Python ARIMA...');
    
    const inputFile = path.join(__dirname, '../forecasting/monthly_input.json');
    const outputFile = path.join(__dirname, '../forecasting/render_upload.json');
    
    // Run Python ARIMA script with all barangays
    await new Promise((resolve, reject) => {
      const pythonProcess = spawn('py', [
        path.join(__dirname, '../forecasting/arima_forecast_12months.py'),
        path.join(__dirname, '../forecasting/all_barangays_input.json'),
        outputFile
      ], {
        cwd: path.join(__dirname, '../forecasting')
      });

      let stdout = '';
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('   🐍', output.trim());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed with code ${code}`));
        }
      });
    });

    // Step 2: Read generated forecasts
    console.log('📊 Processing generated forecasts...');
    const forecastData = JSON.parse(await fs.readFile(outputFile, 'utf8'));
    
    // Flatten the forecasts from the monthly structure
    const allForecasts = [];
    for (const monthKey in forecastData.forecasts_by_month) {
      allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
    }
    
    console.log(`✅ Generated ${allForecasts.length} forecasts to convert to SQL`);

    // Step 3: Generate SQL statements
    console.log('📝 Creating SQL INSERT statements...');
    
    let sqlContent = `-- ARIMA Forecasts Upload SQL for Render Database\n`;
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlContent += `-- Total forecasts: ${allForecasts.length}\n\n`;
    
    // Clear existing forecasts for the next 12 months
    sqlContent += `-- Clear existing synthetic forecasts\n`;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      sqlContent += `DELETE FROM forecasts WHERE year = ${year} AND month = ${month};\n`;
    }
    
    sqlContent += `\n-- Insert real ARIMA forecasts\n`;
    
    // Generate INSERT statements
    for (const forecast of allForecasts) {
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

      const barangayName = forecast.barangay_name.replace(/'/g, "''"); // Escape single quotes
      const predictedCases = Math.round(forecast.predicted_cases * 100) / 100;
      const lowerBound = Math.round(forecast.lower_bound * 100) / 100;
      const upperBound = Math.round(forecast.upper_bound * 100) / 100;

      sqlContent += `INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) VALUES ('${barangayName}', ${forecast.month}, ${forecast.year}, ${predictedCases}, ${lowerBound}, ${upperBound}, '${riskLevel}', ${riskFlag}, NOW());\n`;
    }

    // Step 4: Save SQL file
    const sqlFile = path.join(__dirname, '../temp/render_upload_forecasts.sql');
    await fs.mkdir(path.dirname(sqlFile), { recursive: true });
    await fs.writeFile(sqlFile, sqlContent);

    console.log(`\n🎉 SUCCESS! SQL file generated: ${sqlFile}`);
    console.log(`📊 Contains ${allForecasts.length} ARIMA forecast INSERT statements`);
    
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`1. Copy the contents of: ${sqlFile}`);
    console.log(`2. Go to your Render database console`);
    console.log(`3. Paste and execute the SQL statements`);
    console.log(`4. Your Render database will have real ARIMA forecasts!`);

    // Show first few lines of SQL as preview
    const sqlLines = sqlContent.split('\n');
    console.log(`\n📄 SQL File Preview (first 10 lines):`);
    sqlLines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${(i+1).toString().padStart(2)}: ${line}`);
    });
    
    console.log(`   ... (${sqlLines.length - 10} more lines)`);

    // Clean up
    await fs.unlink(outputFile).catch(() => {}); // Remove temp JSON file
    
  } catch (error) {
    console.error('❌ Error in SQL generation:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (require.main === module) {
  generateSQLForRender();
}

module.exports = { generateSQLForRender };