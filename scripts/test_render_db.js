// Test Render backend database connectivity
const db = require('../config/db');

async function testRenderBackendConnection() {
  try {
    console.log('🔍 Testing Render Backend Database Connection...');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔗 DATABASE_URL present:', !!process.env.DATABASE_URL);
    
    // Test connection
    const result = await db.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Connected successfully');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️  Database name:', result.rows[0].db_name);
    
    // Check forecasts
    console.log('\n📊 Checking forecasts table...');
    const forecastCount = await db.query('SELECT COUNT(*) as count FROM forecasts');
    console.log('Total forecasts:', forecastCount.rows[0].count);
    
    if (parseInt(forecastCount.rows[0].count) > 0) {
      const periods = await db.query(`
        SELECT year, month, COUNT(*) as count 
        FROM forecasts 
        GROUP BY year, month 
        ORDER BY year, month
      `);
      console.log('Available periods:');
      periods.rows.forEach(p => {
        console.log(`  ${p.year}-${p.month.toString().padStart(2, '0')}: ${p.count} forecasts`);
      });
    } else {
      console.log('❌ No forecasts found in production database!');
      console.log('🔧 Need to run forecast generation on production');
    }
    
    // Check other tables
    console.log('\n📋 Other table counts:');
    const tables = ['historical_fires', 'users', 'barangays', 'notifications'];
    for (const table of tables) {
      try {
        const count = await db.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${count.rows[0].count}`);
      } catch (err) {
        console.log(`  ${table}: ERROR - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
  
  return true;
}

// Add this to the server startup to verify database state
module.exports = { testRenderBackendConnection };