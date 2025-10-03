/**
 * Database Migration: Create forecasts table
 * 
 * This script creates the forecasts table to store ARIMA fire risk predictions
 * Run this script once to set up the database schema for forecasting.
 * 
 * Usage: node scripts/create_forecasts_table.js
 */

const db = require('../db');

async function createForecastsTable() {
  try {
    console.log('Creating forecasts table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS forecasts (
        id SERIAL PRIMARY KEY,
        barangay_name VARCHAR(255) NOT NULL,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL CHECK (year >= 2020),
        predicted_cases DECIMAL(10, 3) NOT NULL DEFAULT 0,
        lower_bound DECIMAL(10, 3) NOT NULL DEFAULT 0,
        upper_bound DECIMAL(10, 3) NOT NULL DEFAULT 0,
        risk_level VARCHAR(50) NOT NULL DEFAULT 'Very Low',
        risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure unique forecasts per barangay per month/year
        UNIQUE(barangay_name, month, year)
      );
    `;
    
    await db.query(createTableQuery);
    console.log('✅ Forecasts table created successfully');
    
    // Create indexes for better query performance
    console.log('Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_forecasts_barangay ON forecasts(barangay_name);',
      'CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(year, month);',
      'CREATE INDEX IF NOT EXISTS idx_forecasts_risk ON forecasts(risk_level, risk_flag);',
      'CREATE INDEX IF NOT EXISTS idx_forecasts_created ON forecasts(created_at);'
    ];
    
    for (const indexQuery of indexes) {
      await db.query(indexQuery);
    }
    
    console.log('✅ Indexes created successfully');
    
    // Add some sample data for testing (optional)
    const addSampleData = process.argv.includes('--sample-data');
    
    if (addSampleData) {
      console.log('Adding sample forecast data...');
      
      const sampleForecasts = [
        { barangay: 'Barangay 1', month: 11, year: 2025, cases: 2.5, lower: 1.2, upper: 4.8, risk: 'Medium', flag: true },
        { barangay: 'Barangay 2', month: 11, year: 2025, cases: 0.8, lower: 0.1, upper: 2.1, risk: 'Very Low', flag: false },
        { barangay: 'Barangay 3', month: 11, year: 2025, cases: 5.2, lower: 3.1, upper: 8.7, risk: 'High', flag: true },
        { barangay: 'Centro', month: 11, year: 2025, cases: 1.3, lower: 0.5, upper: 3.2, risk: 'Low-Moderate', flag: false }
      ];
      
      const insertQuery = `
        INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (barangay_name, month, year) DO NOTHING
      `;
      
      for (const forecast of sampleForecasts) {
        await db.query(insertQuery, [
          forecast.barangay,
          forecast.month,
          forecast.year,
          forecast.cases,
          forecast.lower,
          forecast.upper,
          forecast.risk,
          forecast.flag
        ]);
      }
      
      console.log(`✅ Added ${sampleForecasts.length} sample forecasts`);
    }
    
    console.log('');
    console.log('=== Database Setup Complete ===');
    console.log('The forecasts table is ready for use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Install Python dependencies: pip install -r forecasting/requirements.txt');
    console.log('2. Test forecast generation: node scripts/generate_monthly_forecasts.js --year 2025 --month 11');
    console.log('3. Set up monthly cron job to run the forecast script');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating forecasts table:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Create Forecasts Table Migration Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/create_forecasts_table.js              # Create table only');
  console.log('  node scripts/create_forecasts_table.js --sample-data # Create table with sample data');
  console.log('');
  console.log('Options:');
  console.log('  --sample-data  Add sample forecast data for testing');
  console.log('  --help, -h     Show this help message');
  process.exit(0);
}

// Run the migration
createForecastsTable();