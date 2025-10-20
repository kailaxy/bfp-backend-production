require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function checkForecasts() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking forecast status...\n');
    
    // Check all barangays with forecasts
    const result = await client.query(`
      SELECT barangay_name, COUNT(*) as forecast_count
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    console.log('Barangays with forecasts:');
    result.rows.forEach(row => {
      console.log(`  ${row.barangay_name}: ${row.forecast_count} forecasts`);
    });
    
    console.log(`\nTotal: ${result.rows.length} barangays\n`);
    
    // Check if Wack-Wack has forecasts
    const wackwackResult = await client.query(`
      SELECT * FROM forecasts
      WHERE barangay_name = 'Wack-Wack Greenhills'
      ORDER BY year, month
      LIMIT 5
    `);
    
    if (wackwackResult.rows.length > 0) {
      console.log('✅ Wack-Wack Greenhills has forecasts:');
      wackwackResult.rows.forEach(row => {
        console.log(`  ${row.year}-${String(row.month).padStart(2, '0')}: ${row.predicted_cases.toFixed(2)} (${row.risk_level})`);
      });
    } else {
      console.log('❌ No forecasts found for Wack-Wack Greenhills');
    }
    
    // Check historical data
    const histResult = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE barangay = 'Wack-Wack Greenhills'
    `);
    
    console.log(`\n📊 Historical fires for Wack-Wack Greenhills: ${histResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkForecasts();
