#!/usr/bin/env node

/**
 * Generate comprehensive ARIMA input from the CSV historical data file
 * This will create forecasts for ALL barangays in the CSV dataset
 */

const fs = require('fs').promises;
const path = require('path');

async function generateFromCSV() {
  console.log('🔍 PROCESSING COMPLETE HISTORICAL DATA FROM CSV...');
  
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '../arima_historical_data.csv');
    const csvContent = await fs.readFile(csvPath, 'utf8');
    
    console.log('📊 Parsing CSV data...');
    
    // Parse CSV (skip header)
    const lines = csvContent.trim().split('\n');
    const header = lines[0]; // barangay,date,incident_count
    const dataLines = lines.slice(1);
    
    console.log(`📋 Found ${dataLines.length} records in CSV`);
    
    // Process CSV data
    const historicalData = [];
    const barangaySet = new Set();
    
    for (const line of dataLines) {
      const [barangay, date, incident_count] = line.split(',');
      
      if (barangay && date && incident_count) {
        historicalData.push({
          barangay: barangay.trim(),
          date: date.trim(),
          incident_count: parseInt(incident_count.trim())
        });
        barangaySet.add(barangay.trim());
      }
    }
    
    const uniqueBarangays = Array.from(barangaySet).sort();
    console.log(`✅ Processed ${historicalData.length} records`);
    console.log(`🏘️ Found ${uniqueBarangays.length} unique barangays`);
    
    // Show all barangays
    console.log('\n📋 All barangays in dataset:');
    uniqueBarangays.forEach((barangay, index) => {
      const count = historicalData.filter(d => d.barangay === barangay).length;
      console.log(`   ${(index + 1).toString().padStart(2)}: ${barangay} (${count} records)`);
    });

    // Create comprehensive input file
    const inputData = {
      historical_data: historicalData,
      start_year: 2025,
      start_month: 10,
      generated_at: new Date().toISOString(),
      data_source: "arima_historical_data.csv",
      total_records: historicalData.length,
      barangays_count: uniqueBarangays.length
    };

    // Save to new input file
    const outputFile = path.join(__dirname, '../forecasting/all_barangays_input.json');
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
    console.error('❌ Error processing CSV data:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

if (require.main === module) {
  generateFromCSV();
}

module.exports = { generateFromCSV };