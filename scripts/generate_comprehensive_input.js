#!/usr/bin/env node

/**
 * Generate comprehensive ARIMA input from historical_fires database table
 * This will create forecasts for ALL barangays with historical data
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Production database connection
const productionPool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateComprehensiveInput() {
  console.log('🔍 FETCHING COMPLETE HISTORICAL DATA FROM RENDER DATABASE...');
  
  try {
    // Query all historical fire data from the database
    console.log('📊 Querying historical_fires table...');
    
    const result = await productionPool.query(`
      SELECT 
        barangay_name,
        EXTRACT(YEAR FROM date_reported) as year,
        EXTRACT(MONTH FROM date_reported) as month,
        COUNT(*) as incident_count
      FROM historical_fires 
      WHERE date_reported IS NOT NULL 
        AND barangay_name IS NOT NULL
      GROUP BY barangay_name, EXTRACT(YEAR FROM date_reported), EXTRACT(MONTH FROM date_reported)
      ORDER BY barangay_name, year, month
    `);

    console.log(`✅ Found ${result.rows.length} monthly records across multiple barangays`);
    
    // Get unique barangays
    const uniqueBarangays = [...new Set(result.rows.map(row => row.barangay_name))];
    console.log(`🏘️ Barangays with historical data: ${uniqueBarangays.length}`);
    
    // Show barangay list
    console.log('📋 Barangays found:');
    uniqueBarangays.forEach((barangay, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}: ${barangay}`);
    });

    // Format data for ARIMA input
    const historicalData = result.rows.map(row => ({
      barangay: row.barangay_name,
      date: `${row.year}-${row.month.toString().padStart(2, '0')}`,
      incident_count: parseInt(row.incident_count)
    }));

    // Create comprehensive input file
    const inputData = {
      historical_data: historicalData,
      start_year: 2025,
      start_month: 10,
      generated_at: new Date().toISOString(),
      data_source: "historical_fires table",
      total_records: historicalData.length,
      barangays_count: uniqueBarangays.length
    };

    // Save to new input file
    const outputFile = path.join(__dirname, '../forecasting/comprehensive_monthly_input.json');
    await fs.writeFile(outputFile, JSON.stringify(inputData, null, 2));

    console.log(`\n🎉 COMPREHENSIVE INPUT FILE CREATED!`);
    console.log(`📁 File: ${outputFile}`);
    console.log(`📊 Total records: ${historicalData.length}`);
    console.log(`🏘️ Barangays: ${uniqueBarangays.length}`);
    
    console.log(`\n📋 Sample data (first 10 records):`);
    historicalData.slice(0, 10).forEach(record => {
      console.log(`   ${record.barangay} ${record.date}: ${record.incident_count} incidents`);
    });

    return outputFile;
    
  } catch (error) {
    console.error('❌ Error fetching historical data:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await productionPool.end();
  }
}

if (require.main === module) {
  generateComprehensiveInput();
}

module.exports = { generateComprehensiveInput };