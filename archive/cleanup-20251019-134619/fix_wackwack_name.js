require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function fixWackwackName() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Wack-wack name mismatch...\n');
    
    // Check current count
    const beforeResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM historical_fires 
      WHERE barangay = 'Wack-wack Greenhills'
    `);
    console.log(`📊 Records with "Wack-wack Greenhills": ${beforeResult.rows[0].count}`);
    
    // Update to match barangays table format
    const updateResult = await client.query(`
      UPDATE historical_fires 
      SET barangay = 'Wack-Wack Greenhills'
      WHERE barangay = 'Wack-wack Greenhills'
    `);
    console.log(`✅ Updated ${updateResult.rowCount} records\n`);
    
    // Verify
    const afterResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM historical_fires 
      WHERE barangay = 'Wack-Wack Greenhills'
    `);
    console.log(`📊 Records with "Wack-Wack Greenhills": ${afterResult.rows[0].count}`);
    
    console.log('\n🎉 Name mismatch fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixWackwackName();
