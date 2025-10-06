#!/usr/bin/env node

/**
 * Generate a clean, pgAdmin-compatible SQL file for ARIMA forecasts
 * This can be run in any PostgreSQL client (pgAdmin, DBeaver, etc.)
 */

const fs = require('fs').promises;
const path = require('path');

async function generateCleanSQL() {
  console.log('📝 GENERATING CLEAN SQL FILE FOR POSTGRESQL CLIENTS...');
  
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
    
    console.log(`✅ Processing ${allForecasts.length} forecasts from all 27 barangays`);

    // Create clean SQL content
    let sqlContent = `-- =====================================================
-- BFP ARIMA FORECASTS - COMPLETE DATASET UPLOAD
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- Total forecasts: ${allForecasts.length}
-- Barangays: 27 (all barangays)
-- Period: October 2025 - September 2026
-- Data source: 15+ years of historical fire data
-- =====================================================

-- Start transaction for atomic operation
BEGIN;

-- Clear existing synthetic forecasts for the next 12 months
`;
    
    // Clear existing forecasts
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      sqlContent += `DELETE FROM forecasts WHERE year = ${year} AND month = ${month};\n`;
    }
    
    sqlContent += `\n-- Insert real ARIMA forecasts for all barangays\n`;
    
    // Group forecasts by barangay for better organization
    const forecastsByBarangay = {};
    allForecasts.forEach(forecast => {
      if (!forecastsByBarangay[forecast.barangay_name]) {
        forecastsByBarangay[forecast.barangay_name] = [];
      }
      forecastsByBarangay[forecast.barangay_name].push(forecast);
    });

    // Generate INSERT statements grouped by barangay
    const barangayNames = Object.keys(forecastsByBarangay).sort();
    
    for (const barangayName of barangayNames) {
      const forecasts = forecastsByBarangay[barangayName];
      sqlContent += `\n-- ${barangayName} (${forecasts.length} months)\n`;
      
      for (const forecast of forecasts) {
        // Determine risk level and flag based on predicted cases
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

        const barangayNameEscaped = forecast.barangay_name.replace(/'/g, "''");
        const predictedCases = Math.round(forecast.predicted_cases * 100) / 100;
        const lowerBound = Math.round(forecast.lower_bound * 100) / 100;
        const upperBound = Math.round(forecast.upper_bound * 100) / 100;

        sqlContent += `INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('${barangayNameEscaped}', ${forecast.month}, ${forecast.year}, ${predictedCases}, ${lowerBound}, ${upperBound}, '${riskLevel}', ${riskFlag}, NOW());\n`;
      }
    }

    sqlContent += `\n-- Commit transaction
COMMIT;

-- Verify upload
SELECT 
    COUNT(*) as total_forecasts,
    COUNT(DISTINCT barangay_name) as barangays_covered,
    MIN(year) as from_year,
    MAX(year) as to_year
FROM forecasts;

-- Show sample by barangay
SELECT 
    barangay_name, 
    COUNT(*) as forecast_months,
    AVG(predicted_cases) as avg_predicted_cases,
    MAX(predicted_cases) as max_predicted_cases
FROM forecasts 
GROUP BY barangay_name 
ORDER BY avg_predicted_cases DESC;
`;

    // Save SQL file
    const sqlFile = path.join(__dirname, '../temp/complete_arima_forecasts.sql');
    await fs.mkdir(path.dirname(sqlFile), { recursive: true });
    await fs.writeFile(sqlFile, sqlContent);

    console.log(`\n🎉 CLEAN SQL FILE GENERATED!`);
    console.log(`📁 File: ${sqlFile}`);
    console.log(`📊 Contains: ${allForecasts.length} ARIMA forecasts`);
    console.log(`🏘️ Covers: All 27 barangays`);
    
    console.log(`\n📋 UPLOAD OPTIONS:`);
    console.log(`1. 🌐 Use a web-based PostgreSQL client (like ElephantSQL browser)`);
    console.log(`2. 💻 Use pgAdmin or DBeaver desktop client`);
    console.log(`3. 🔧 Use psql command line tool`);
    console.log(`4. 📱 Try Render's database browser (if available)`);
    
    console.log(`\n📄 File contains:`);
    console.log(`   • Transaction BEGIN/COMMIT for safety`);
    console.log(`   • Clear existing synthetic data`);
    console.log(`   • Insert ${allForecasts.length} real ARIMA forecasts`);
    console.log(`   • Verification queries`);
    
    return sqlFile;
    
  } catch (error) {
    console.error('❌ Error generating clean SQL:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

if (require.main === module) {
  generateCleanSQL();
}

module.exports = { generateCleanSQL };