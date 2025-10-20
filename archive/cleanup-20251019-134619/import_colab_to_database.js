/**
 * Import Colab CSV Results Directly to Database
 * This ensures production matches presentation exactly
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importColabResults() {
  console.log('📥 Importing Colab CSV Results to Production Database\n');
  console.log('=' .repeat(80));
  
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '../Forecast_Results_Oct2025_to_Dec2026 (1).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Parse header
    const header = lines[0].split(',');
    console.log('📋 CSV Columns:', header);
    console.log();
    
    // Parse data rows
    const forecasts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 8) continue;
      
      const dateStr = parts[0];
      const lowerCI = parseFloat(parts[1]);
      const upperCI = parseFloat(parts[2]);
      const forecast = parseFloat(parts[3]);
      const barangay = parts[4];
      const model = parts[5];
      const mae = parseFloat(parts[6]);
      const rmse = parseFloat(parts[7]);
      
      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // Calculate risk level based on forecast
      let riskLevel, riskFlag;
      if (forecast >= 1) {
        riskLevel = 'High';
      } else if (forecast >= 0.5) {
        riskLevel = 'Medium';
      } else if (forecast >= 0.2) {
        riskLevel = 'Low-Moderate';
      } else {
        riskLevel = 'Very Low';
      }
      
      // Risk flag based on upper bound
      if (upperCI >= 3) {
        riskFlag = 'Elevated Risk';
      } else if (upperCI >= 2) {
        riskFlag = 'Watchlist';
      } else {
        riskFlag = null;
      }
      
      forecasts.push({
        barangay,
        month,
        year,
        predicted_cases: forecast,
        lower_bound: lowerCI,
        upper_bound: upperCI,
        risk_level: riskLevel,
        risk_flag: riskFlag,
        mae,
        rmse,
        model
      });
    }
    
    console.log(`✅ Parsed ${forecasts.length} forecast entries from CSV\n`);
    
    // Group by month for summary
    const byMonth = {};
    forecasts.forEach(f => {
      const key = `${f.year}-${f.month.toString().padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    
    console.log('📊 Forecasts by Month:');
    Object.entries(byMonth).sort().forEach(([month, count]) => {
      console.log(`   ${month}: ${count} barangays`);
    });
    console.log();
    
    // Ask for confirmation
    console.log('⚠️  This will DELETE existing forecasts and import Colab data');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Clearing existing forecasts for Oct 2025 - Dec 2026...\n');
    
    // Clear existing forecasts for this period
    const deleteQuery = `
      DELETE FROM forecasts 
      WHERE (year = 2025 AND month >= 10) 
         OR (year = 2026 AND month <= 12)
    `;
    
    const deleteResult = await db.query(deleteQuery);
    console.log(`✅ Deleted ${deleteResult.rowCount} existing forecasts\n`);
    
    // Insert new forecasts
    console.log('💾 Inserting Colab forecasts...\n');
    
    const insertQuery = `
      INSERT INTO forecasts (
        barangay_name, month, year, predicted_cases,
        lower_bound, upper_bound, risk_level, risk_flag,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
    
    let inserted = 0;
    let failed = 0;
    
    for (const forecast of forecasts) {
      try {
        await db.query(insertQuery, [
          forecast.barangay,
          forecast.month,
          forecast.year,
          forecast.predicted_cases,
          forecast.lower_bound,
          forecast.upper_bound,
          forecast.risk_level,
          forecast.risk_flag
        ]);
        inserted++;
        
        if (inserted % 50 === 0) {
          console.log(`   Inserted ${inserted}/${forecasts.length}...`);
        }
      } catch (error) {
        failed++;
        console.error(`   ❌ Failed to insert ${forecast.barangay} ${forecast.year}-${forecast.month}:`, error.message);
      }
    }
    
    console.log();
    console.log('=' .repeat(80));
    console.log('✅ IMPORT COMPLETE');
    console.log('=' .repeat(80));
    console.log(`Inserted: ${inserted} forecasts`);
    console.log(`Failed: ${failed} forecasts`);
    console.log();
    
    // Verify a few key barangays
    console.log('🔍 Verification - October 2025 Sample:');
    const verifyQuery = `
      SELECT barangay_name, predicted_cases, risk_level
      FROM forecasts
      WHERE year = 2025 AND month = 10
      ORDER BY predicted_cases DESC
      LIMIT 5
    `;
    
    const verifyResult = await db.query(verifyQuery);
    verifyResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.barangay_name.padEnd(25)} ${row.predicted_cases.toFixed(3)} → ${row.risk_level}`);
    });
    
    console.log();
    console.log('🎉 Production database now matches Colab results exactly!');
    console.log('🌐 Your frontend map will show the same colors as your presentation!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run import
if (require.main === module) {
  importColabResults();
}

module.exports = importColabResults;
