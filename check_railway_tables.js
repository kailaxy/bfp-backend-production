/**
 * Check what tables exist in Railway database
 */

const { Pool } = require('pg');

async function main() {
  console.log('\n=== Railway Database Tables ===\n');
  
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
    const result = await pool.query(`
      SELECT tablename, schemaname
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`Found ${result.rows.length} tables:\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No tables found! Database is empty.\n');
      console.log('You need to create the database schema first.');
      console.log('Options:');
      console.log('  1. Import from Render database backup');
      console.log('  2. Run migration scripts to create tables');
      console.log('  3. Use Railway database template if available\n');
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.tablename}`);
      });
      console.log('');
      
      // Check if forecasts_graphs exists
      const hasGraphTable = result.rows.some(r => r.tablename === 'forecasts_graphs');
      if (hasGraphTable) {
        const countResult = await pool.query('SELECT COUNT(*) FROM forecasts_graphs');
        console.log(`\n✅ forecasts_graphs table exists with ${countResult.rows[0].count} records\n`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
