// ================================================================
// Execute forecasts_graphs table migration
// Run: node migrations/run_forecasts_graphs_migration.js
// ================================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load database configuration
require('dotenv').config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your .env file or environment.');
  console.error('Example: DATABASE_URL=postgresql://user:password@host:5432/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
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
    
    console.log('\n✅ forecasts_graphs table is ready for use!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
