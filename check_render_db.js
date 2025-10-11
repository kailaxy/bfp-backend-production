/**
 * Check Render PostgreSQL database for graph data
 */

const { Pool } = require('pg');

async function main() {
  console.log('\n=== Checking Graph Data in Render Database ===\n');
  
  const pool = new Pool({
    host: 'dpg-d35r1s2li9vc73819f70-a.oregon-postgres.render.com',
    port: 5432,
    database: 'bfpmapping_nua2',
    user: 'bfpmapping_nua2_user',
    password: 'mDB9Q1s6mnnTyXGgzqSMD5CTpHUsvR6L',
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
      console.log('❌ Table is empty!\n');
      return;
    }
    
    console.log('✅ Graph data EXISTS!\n');
    
    // Check records by barangay
    console.log('Records by barangay:');
    const barangayResult = await pool.query(`
      SELECT barangay, COUNT(*) as count
      FROM forecasts_graphs
      GROUP BY barangay
      ORDER BY barangay
      LIMIT 10
    `);
    
    barangayResult.rows.forEach(row => {
      console.log(`   ${row.barangay}: ${row.count} records`);
    });
    
    console.log(`   ... (showing first 10 barangays)\n`);
    
    // Check records by type
    console.log('Records by type:');
    const typeResult = await pool.query(`
      SELECT record_type, COUNT(*) as count
      FROM forecasts_graphs
      GROUP BY record_type
      ORDER BY record_type
    `);
    
    typeResult.rows.forEach(row => {
      console.log(`   ${row.record_type}: ${row.count} records`);
    });
    
    // Sample data from Addition Hills
    console.log('\nSample forecast data (Addition Hills - first 5 records):');
    const sampleResult = await pool.query(`
      SELECT record_type, date, value
      FROM forecasts_graphs
      WHERE barangay = 'Addition Hills' AND record_type = 'forecast'
      ORDER BY date
      LIMIT 5
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.date}: ${row.value}`);
    });
    
    console.log('\n✅ SUCCESS! Graph data is stored and ready for visualization!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
