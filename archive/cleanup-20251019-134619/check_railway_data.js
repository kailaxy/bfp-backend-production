/**
 * Check if Railway database has historical data for forecasting
 */

const { Pool } = require('pg');

async function main() {
  console.log('\n=== Checking Railway Database Data ===\n');
  
  const pool = new Pool({
    host: 'turntable.proxy.rlwy.net',
    port: 30700,
    database: 'railway',
    user: 'postgres',
    password: 'gtjgsixajmDAShmhwqFiqIlkLwuicgDT',
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check historical_fires
    console.log('Checking historical_fires table...');
    const histResult = await pool.query('SELECT COUNT(*), MIN(incident_date), MAX(incident_date) FROM historical_fires');
    console.log(`  Records: ${histResult.rows[0].count}`);
    console.log(`  Date range: ${histResult.rows[0].min} to ${histResult.rows[0].max}\n`);
    
    // Check forecasts
    console.log('Checking forecasts table...');
    const forecastResult = await pool.query('SELECT COUNT(*) FROM forecasts');
    console.log(`  Records: ${forecastResult.rows[0].count}\n`);
    
    // Check barangays
    console.log('Checking barangays table...');
    const barangayResult = await pool.query('SELECT COUNT(*), array_agg(name ORDER BY name) as names FROM barangays');
    console.log(`  Records: ${barangayResult.rows[0].count}`);
    if (barangayResult.rows[0].count > 0 && barangayResult.rows[0].count <= 30) {
      console.log(`  Barangays:`, barangayResult.rows[0].names);
    }
    console.log('');
    
    if (histResult.rows[0].count === '0') {
      console.log('❌ No historical fire data found!');
      console.log('   Cannot generate forecasts without historical data.');
      console.log('   Need to import data from Render database.\n');
    } else {
      console.log('✅ Database has data for forecasting!\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
