// ================================================================
// Execute forecasts_graphs table migration on Railway Production
// This script can be run locally to migrate the Railway database
// ================================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Railway Production Database URL (from Railway dashboard)
// You can also set this as an environment variable: RAILWAY_DATABASE_URL
const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || 
  'postgresql://postgres:IVcKXmFkHbkQdBlIrvfQtCllMoKcTBDD@autorack.proxy.rlwy.net:21749/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚂 Connecting to Railway Production Database...\n');
  
  const client = await pool.connect();
  
  try {
    // Verify connection
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    console.log('✅ Connected to database:');
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    console.log(`   PostgreSQL: ${dbInfo.rows[0].version.split(',')[0]}\n`);
    
    console.log('🔄 Starting forecasts_graphs table migration...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_forecasts_graphs_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    console.log('📝 Executing SQL migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify table creation
    const verifyResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'forecasts_graphs'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Table structure verification:');
    console.table(verifyResult.rows);
    
    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'forecasts_graphs';
    `);
    
    console.log('\n📌 Indexes created:');
    console.table(indexResult.rows);
    
    // Check constraints
    const constraintResult = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'forecasts_graphs'::regclass;
    `);
    
    console.log('\n🔒 Constraints:');
    console.table(constraintResult.rows);
    
    console.log('\n✅ forecasts_graphs table is ready for use on Railway!');
    console.log('\n📊 Next steps:');
    console.log('   1. Generate new forecasts to populate graph data');
    console.log('   2. Check graph data: SELECT barangay, record_type, COUNT(*) FROM forecasts_graphs GROUP BY barangay, record_type;');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('🚂 Railway Database Migration Tool');
console.log('=' .repeat(60));
console.log('Table: forecasts_graphs');
console.log('Purpose: Store ARIMA forecast graph visualization data');
console.log('=' .repeat(60) + '\n');

runMigration();
