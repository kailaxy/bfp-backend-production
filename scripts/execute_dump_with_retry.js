#!/usr/bin/env node

/**
 * Execute the PostgreSQL dump using Node.js with retry logic
 * This handles SSL and connection issues better than direct psql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function executeDumpWithRetry() {
  console.log('🚀 EXECUTING POSTGRESQL DUMP WITH RETRY LOGIC...');
  
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    attempt++;
    console.log(`\n🔄 Connection attempt ${attempt}/${maxRetries}...`);
    
    let pool;
    
    try {
      // Try different SSL configurations
      const sslConfigs = [
        { rejectUnauthorized: false }, // Most permissive
        { rejectUnauthorized: true },  // Strict
        false                          // No SSL
      ];
      
      const sslConfig = sslConfigs[attempt - 1] || sslConfigs[0];
      
      console.log(`🔐 Using SSL config: ${JSON.stringify(sslConfig)}`);
      
      // Create connection pool
      pool = new Pool({
        connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
        ssl: sslConfig,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      });
      
      // Test connection
      console.log('🧪 Testing connection...');
      const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
      console.log(`✅ Connected! Time: ${testResult.rows[0].current_time}`);
      console.log(`📊 PostgreSQL: ${testResult.rows[0].pg_version.split(' ')[1]}`);
      
      // Read and execute the dump file
      console.log('📖 Reading dump file...');
      const dumpFile = path.join(__dirname, '../temp/bfp_arima_forecasts.sql');
      const dumpContent = await fs.readFile(dumpFile, 'utf8');
      
      console.log('🗑️ Dropping and recreating forecasts table...');
      console.log('⚠️  This will COMPLETELY REPLACE all existing forecast data!');
      
      // Execute the entire dump
      console.log('💾 Executing dump (this may take a moment)...');
      await pool.query(dumpContent);
      
      console.log('🔍 Verifying results...');
      const verifyResult = await pool.query(`
        SELECT 
          COUNT(*) as total_forecasts,
          COUNT(DISTINCT barangay_name) as unique_barangays,
          MIN(year || '-' || LPAD(month::text, 2, '0')) as from_period,
          MAX(year || '-' || LPAD(month::text, 2, '0')) as to_period
        FROM forecasts
      `);
      
      const stats = verifyResult.rows[0];
      console.log(`\n🎉 SUCCESS! ARIMA FORECASTS RESTORED!`);
      console.log(`📊 Total forecasts: ${stats.total_forecasts}`);
      console.log(`🏘️ Unique barangays: ${stats.unique_barangays}`);
      console.log(`📅 Period: ${stats.from_period} to ${stats.to_period}`);
      
      // Show sample data
      const sampleResult = await pool.query(`
        SELECT barangay_name, month, year, predicted_cases, risk_level, risk_flag
        FROM forecasts 
        ORDER BY predicted_cases DESC, barangay_name 
        LIMIT 10
      `);
      
      console.log(`\n📋 Sample forecasts (top 10 by predicted cases):`);
      sampleResult.rows.forEach(row => {
        const alert = row.risk_flag ? '🚨' : '📊';
        console.log(`   ${alert} ${row.barangay_name} ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.predicted_cases} cases (${row.risk_level})`);
      });
      
      console.log(`\n🚀 Your Render database now has real ARIMA forecasts!`);
      console.log(`🗺️ Frontend will immediately show authentic predictions for all 27 barangays!`);
      
      await pool.end();
      return true;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      if (attempt === maxRetries) {
        console.error('\n💔 All connection attempts failed!');
        console.error('🔍 This might be due to:');
        console.error('   • Render database is sleeping (try again in 2-3 minutes)');
        console.error('   • Network firewall blocking PostgreSQL connections');
        console.error('   • Render free tier connection limits');
        console.error('\n🔄 Try running this script again in a few minutes');
        throw error;
      } else {
        console.log(`⏳ Waiting 10 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}

if (require.main === module) {
  executeDumpWithRetry().catch(error => {
    console.error('💥 Final error:', error.message);
    process.exit(1);
  });
}

module.exports = { executeDumpWithRetry };