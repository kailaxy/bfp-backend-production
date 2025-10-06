#!/usr/bin/env node

/**
 * Check the forecasts table schema to understand the risk_flag column type
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkForecastsSchema() {
  try {
    console.log('🔍 Checking forecasts table schema...');
    
    // Get table schema
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'forecasts' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(schemaQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ Forecasts table not found!');
      return;
    }
    
    console.log('📋 Forecasts table schema:');
    console.table(result.rows);
    
    // Check risk_flag column specifically
    const riskFlagColumn = result.rows.find(row => row.column_name === 'risk_flag');
    if (riskFlagColumn) {
      console.log(`\n🎯 risk_flag column details:`);
      console.log(`- Type: ${riskFlagColumn.data_type}`);
      console.log(`- Nullable: ${riskFlagColumn.is_nullable}`);
      console.log(`- Default: ${riskFlagColumn.column_default || 'None'}`);
    } else {
      console.log('❌ risk_flag column not found!');
    }
    
    // Try to get sample data to see what values are expected
    const sampleQuery = `SELECT DISTINCT risk_flag FROM forecasts LIMIT 10`;
    try {
      const sampleResult = await pool.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        console.log('\n📊 Existing risk_flag values:');
        sampleResult.rows.forEach(row => {
          console.log(`- ${row.risk_flag} (type: ${typeof row.risk_flag})`);
        });
      } else {
        console.log('\n📊 No existing forecast data found');
      }
    } catch (err) {
      console.log('\n📊 No existing forecast data to check');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkForecastsSchema();