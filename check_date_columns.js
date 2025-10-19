require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function checkDateColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking date columns in historical_fires...\n');
    
    // Check reported_at
    const reportedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE reported_at IS NOT NULL
    `);
    console.log(`reported_at IS NOT NULL: ${reportedResult.rows[0].count} records`);
    
    // Check resolved_at
    const resolvedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE resolved_at IS NOT NULL
    `);
    console.log(`resolved_at IS NOT NULL: ${resolvedResult.rows[0].count} records`);
    
    // Total records
    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
    `);
    console.log(`Total records: ${totalResult.rows[0].count}`);
    
    // Sample data
    console.log('\nSample record:');
    const sampleResult = await client.query(`
      SELECT barangay, reported_at, resolved_at
      FROM historical_fires
      LIMIT 1
    `);
    console.log(sampleResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDateColumns();
