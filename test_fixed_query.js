require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function testQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing fixed query...\n');
    
    const query = `
      SELECT 
        barangay,
        TO_CHAR(resolved_at, 'YYYY-MM') as date,
        COUNT(*) as incident_count
      FROM historical_fires
      WHERE barangay IS NOT NULL 
        AND barangay != ''
        AND resolved_at IS NOT NULL
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay, date
    `;
    
    const result = await client.query(query);
    console.log(`✅ Fetched ${result.rows.length} barangay-month records`);
    
    // Count unique barangays
    const uniqueBarangays = new Set(result.rows.map(r => r.barangay));
    console.log(`📊 Unique barangays: ${uniqueBarangays.size}`);
    
    // Show sample
    console.log('\nSample records:');
    result.rows.slice(0, 5).forEach(row => {
      console.log(`  ${row.barangay} | ${row.date} | ${row.incident_count} incidents`);
    });
    
    // Check for Wack-Wack
    const wackwackRecords = result.rows.filter(r => r.barangay === 'Wack-Wack Greenhills');
    console.log(`\n✅ Wack-Wack Greenhills: ${wackwackRecords.length} month-records found`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();
