const db = require('../config/db');

async function checkProductionData() {
  try {
    console.log('🔍 Checking database connection and data...');
    
    // Test basic connection
    const connectionTest = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', connectionTest.rows[0]);
    
    // Check forecasts table
    console.log('\n📊 Checking forecasts data...');
    const forecastsCount = await db.query('SELECT COUNT(*) as count FROM forecasts');
    console.log('Total forecasts:', forecastsCount.rows[0].count);
    
    if (forecastsCount.rows[0].count > 0) {
      // Get available months/years
      const availableData = await db.query(`
        SELECT DISTINCT year, month, COUNT(*) as count 
        FROM forecasts 
        GROUP BY year, month 
        ORDER BY year DESC, month DESC 
        LIMIT 10
      `);
      console.log('Available forecast periods:');
      availableData.rows.forEach(row => {
        console.log(`  ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.count} forecasts`);
      });
    }
    
    // Check other tables
    console.log('\n📋 Checking other tables...');
    const tables = ['notifications', 'users', 'barangays', 'historical_fires'];
    
    for (const table of tables) {
      try {
        const count = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${count.rows[0].count} records`);
      } catch (err) {
        console.log(`${table}: ERROR - ${err.message}`);
      }
    }
    
    // Check if there's a current user that can be used
    console.log('\n👤 Checking users for auth...');
    const users = await db.query('SELECT id, username, role FROM users ORDER BY id LIMIT 5');
    if (users.rows.length > 0) {
      console.log('Available users:');
      users.rows.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
      });
    } else {
      console.log('No users found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkProductionData();