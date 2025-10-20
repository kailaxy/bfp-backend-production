require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function checkEstimatedDamage() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking estimated_damage column...\n');
    
    // Check data type
    const typeResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'historical_fires' AND column_name = 'estimated_damage'
    `);
    
    console.log('Column Info:');
    console.log(typeResult.rows[0]);
    console.log();
    
    // Sample values
    console.log('Sample values from database:');
    const sampleResult = await client.query(`
      SELECT 
        id,
        barangay,
        estimated_damage,
        pg_typeof(estimated_damage) as type
      FROM historical_fires
      WHERE estimated_damage IS NOT NULL
      LIMIT 10
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: "${row.estimated_damage}" (${row.type})`);
    });
    
    // Count various patterns
    console.log('\n📊 Damage value patterns:');
    
    const nullCount = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE estimated_damage IS NULL
    `);
    console.log(`  NULL values: ${nullCount.rows[0].count}`);
    
    const emptyCount = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE estimated_damage IS NOT NULL AND estimated_damage::text = ''
    `);
    console.log(`  Empty strings: ${emptyCount.rows[0].count}`);
    
    const zeroCount = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE estimated_damage IS NOT NULL 
        AND estimated_damage::text != ''
        AND estimated_damage::numeric = 0
    `);
    console.log(`  Zero values: ${zeroCount.rows[0].count}`);
    
    const nonZeroCount = await client.query(`
      SELECT COUNT(*) as count
      FROM historical_fires
      WHERE estimated_damage IS NOT NULL 
        AND estimated_damage::text != ''
        AND estimated_damage::numeric > 0
    `);
    console.log(`  Non-zero values: ${nonZeroCount.rows[0].count}`);
    
    // Sample of non-zero values
    if (parseInt(nonZeroCount.rows[0].count) > 0) {
      console.log('\nSample non-zero damages:');
      const nonZeroSample = await client.query(`
        SELECT 
          barangay,
          estimated_damage,
          resolved_at
        FROM historical_fires
        WHERE estimated_damage IS NOT NULL 
          AND estimated_damage::text != ''
          AND estimated_damage::numeric > 0
        ORDER BY estimated_damage::numeric DESC
        LIMIT 10
      `);
      
      nonZeroSample.rows.forEach(row => {
        const date = new Date(row.resolved_at).toISOString().split('T')[0];
        console.log(`  ${row.barangay.padEnd(25)} ₱${parseFloat(row.estimated_damage).toLocaleString().padStart(15)} (${date})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEstimatedDamage();
