/**
 * Direct database check for graph data
 */

const { Pool } = require('pg');

async function main() {
  console.log('\n=== Checking Graph Data in Railway Database ===\n');
  
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
    // Check total count
    console.log('Checking total records...');
    const countResult = await pool.query('SELECT COUNT(*) FROM forecasts_graphs');
    const totalCount = parseInt(countResult.rows[0].count);
    
    console.log(`\n📊 Total records: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('❌ Table is empty! Graph data was not stored.\n');
      console.log('Possible issues:');
      console.log('1. Python script did not generate graph_data array');
      console.log('2. Backend service failed to store the data');
      console.log('3. Database connection issue during storage\n');
      return;
    }
    
    // Check records by barangay
    console.log('Records by barangay:');
    const barangayResult = await pool.query(`
      SELECT barangay, COUNT(*) as count
      FROM forecasts_graphs
      GROUP BY barangay
      ORDER BY barangay
    `);
    
    barangayResult.rows.forEach(row => {
      console.log(`   ${row.barangay}: ${row.count} records`);
    });
    
    // Check records by type
    console.log('\nRecords by type:');
    const typeResult = await pool.query(`
      SELECT record_type, COUNT(*) as count
      FROM forecasts_graphs
      GROUP BY record_type
      ORDER BY record_type
    `);
    
    typeResult.rows.forEach(row => {
      console.log(`   ${row.record_type}: ${row.count} records`);
    });
    
    // Check date range
    console.log('\nDate range:');
    const dateResult = await pool.query(`
      SELECT 
        MIN(date) as earliest,
        MAX(date) as latest
      FROM forecasts_graphs
    `);
    
    console.log(`   ${dateResult.rows[0].earliest} to ${dateResult.rows[0].latest}`);
    
    // Sample data from Addition Hills
    console.log('\nSample data (Addition Hills - first 5 forecast records):');
    const sampleResult = await pool.query(`
      SELECT record_type, date, value
      FROM forecasts_graphs
      WHERE barangay = 'Addition Hills' AND record_type = 'forecast'
      ORDER BY date
      LIMIT 5
    `);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach(row => {
        console.log(`   ${row.date}: ${row.value} (${row.record_type})`);
      });
    } else {
      console.log('   No forecast data found for Addition Hills');
    }
    
    console.log('\n✅ Graph data verification complete!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
