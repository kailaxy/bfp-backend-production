require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function cleanupExtraForecasts() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning up extra forecasts...\n');
    
    // Check current state
    const beforeResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT barangay_name) as barangays,
        MIN(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as earliest,
        MAX(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as latest
      FROM forecasts
    `);
    
    console.log('Before cleanup:');
    console.log(`  Total forecasts: ${beforeResult.rows[0].total}`);
    console.log(`  Barangays: ${beforeResult.rows[0].barangays}`);
    console.log(`  Date range: ${beforeResult.rows[0].earliest} to ${beforeResult.rows[0].latest}\n`);
    
    // Delete forecasts beyond October 2026 (13 months from Oct 2025)
    console.log('Deleting forecasts after October 2026...');
    const deleteResult = await client.query(`
      DELETE FROM forecasts 
      WHERE (year > 2026) OR (year = 2026 AND month > 10)
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} forecasts beyond Oct 2026\n`);
    
    // Check after cleanup
    const afterResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT barangay_name) as barangays,
        MIN(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as earliest,
        MAX(DATE(year || '-' || LPAD(month::text, 2, '0') || '-01')) as latest
      FROM forecasts
    `);
    
    console.log('After cleanup:');
    console.log(`  Total forecasts: ${afterResult.rows[0].total}`);
    console.log(`  Barangays: ${afterResult.rows[0].barangays}`);
    console.log(`  Date range: ${afterResult.rows[0].earliest} to ${afterResult.rows[0].latest}\n`);
    
    // Check per-barangay counts
    const countResult = await client.query(`
      SELECT 
        barangay_name,
        COUNT(*) as count
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY count DESC, barangay_name
      LIMIT 10
    `);
    
    console.log('Top 10 barangays by forecast count:');
    countResult.rows.forEach(row => {
      console.log(`  ${row.barangay_name}: ${row.count} months`);
    });
    
    // Also cleanup forecasts_graphs
    console.log('\n🧹 Cleaning up forecasts_graphs...');
    const graphDeleteResult = await client.query(`
      DELETE FROM forecasts_graphs 
      WHERE record_type = 'forecast' 
        AND date > '2026-10-01'
    `);
    
    console.log(`✅ Deleted ${graphDeleteResult.rowCount} graph records beyond Oct 2026`);
    
    console.log('\n✅ Cleanup complete!');
    console.log('\n⚠️  Note: You should regenerate forecasts to ensure consistency.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupExtraForecasts();
