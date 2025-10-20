// Run migration to add model_used column to forecasts table
const db = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    console.log('📊 Running migration: add_model_used_to_forecasts.sql');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add_model_used_to_forecasts.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    await db.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const checkQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'forecasts' 
      AND column_name IN ('model_used', 'confidence_interval')
      ORDER BY column_name;
    `;
    
    const result = await db.query(checkQuery);
    console.log('\n📋 Verified columns in forecasts table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
