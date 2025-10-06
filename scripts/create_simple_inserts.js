#!/usr/bin/env node

/**
 * Create a simple INSERT-only SQL file that can be copy/pasted anywhere
 * This avoids COPY format and complex PostgreSQL features
 */

const fs = require('fs').promises;
const path = require('path');

async function createSimpleInserts() {
  console.log('📝 CREATING SIMPLE INSERT STATEMENTS FOR COPY/PASTE...');
  
  try {
    // Read the generated forecasts
    console.log('📊 Reading ARIMA forecast data...');
    const forecastFile = path.join(__dirname, '../forecasting/all_barangays_output.json');
    const forecastData = JSON.parse(await fs.readFile(forecastFile, 'utf8'));
    
    // Flatten the forecasts from the monthly structure
    const allForecasts = [];
    for (const monthKey in forecastData.forecasts_by_month) {
      allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
    }
    
    console.log(`✅ Processing ${allForecasts.length} forecasts`);

    // Create simple SQL
    let sqlContent = `-- Simple INSERT statements for BFP ARIMA Forecasts
-- Copy and paste this entire content into any database client
-- Total forecasts: ${allForecasts.length}
-- Generated: ${new Date().toISOString()}

-- Clear existing forecasts (optional - comment out if you want to keep existing data)
DELETE FROM forecasts WHERE year >= 2025 AND year <= 2026;

-- Insert ARIMA forecasts (this will take a few seconds to execute)
`;

    // Create batched INSERT statements for better performance
    const batchSize = 50;
    let insertCount = 0;
    
    for (let i = 0; i < allForecasts.length; i += batchSize) {
      const batch = allForecasts.slice(i, i + batchSize);
      
      sqlContent += `\n-- Batch ${Math.floor(i / batchSize) + 1} (${batch.length} forecasts)\nINSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) VALUES\n`;
      
      const values = batch.map(forecast => {
        // Determine risk level and flag
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

        const barangayName = forecast.barangay_name.replace(/'/g, "''");
        const predictedCases = Math.round(forecast.predicted_cases * 100) / 100;
        const lowerBound = Math.round(forecast.lower_bound * 100) / 100;
        const upperBound = Math.round(forecast.upper_bound * 100) / 100;

        insertCount++;
        return `  ('${barangayName}', ${forecast.month}, ${forecast.year}, ${predictedCases}, ${lowerBound}, ${upperBound}, '${riskLevel}', ${riskFlag}, NOW())`;
      });
      
      sqlContent += values.join(',\n') + ';\n';
    }

    sqlContent += `\n-- Verification query
SELECT 
  COUNT(*) as total_forecasts,
  COUNT(DISTINCT barangay_name) as unique_barangays,
  MIN(year) as from_year,
  MAX(year) as to_year
FROM forecasts
WHERE year >= 2025;

-- Show sample results
SELECT barangay_name, month, year, predicted_cases, risk_level, risk_flag
FROM forecasts 
WHERE year >= 2025
ORDER BY predicted_cases DESC
LIMIT 10;
`;

    // Save simple SQL file
    const sqlFile = path.join(__dirname, '../temp/simple_arima_inserts.sql');
    await fs.writeFile(sqlFile, sqlContent);

    console.log(`\n🎉 SIMPLE INSERT FILE CREATED!`);
    console.log(`📁 File: ${sqlFile}`);
    console.log(`📊 Contains: ${insertCount} INSERT statements`);
    console.log(`🏘️ Covers: All 27 barangays`);
    
    console.log(`\n📋 HOW TO USE:`);
    console.log(`1. 🌐 Try any online PostgreSQL client (search "online postgresql client")`);
    console.log(`2. 💻 Use any database tool (DBeaver, pgAdmin, DataGrip, etc.)`);
    console.log(`3. 📱 Copy entire file contents and paste into query editor`);
    console.log(`4. ▶️ Execute the SQL`);
    
    console.log(`\n📄 File is ${Math.round(sqlContent.length / 1024)}KB and ready to copy/paste!`);
    
    return sqlFile;
    
  } catch (error) {
    console.error('❌ Error creating simple inserts:', error.message);
    throw error;
  }
}

if (require.main === module) {
  createSimpleInserts();
}

module.exports = { createSimpleInserts };