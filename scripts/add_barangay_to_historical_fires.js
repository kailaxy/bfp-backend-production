const pool = require('../config/db');

async function addBarangayColumn() {
  try {
    console.log('🔧 Adding barangay column to historical_fires table...');
    
    // Check if barangay column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'historical_fires' 
        AND column_name = 'barangay'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Barangay column already exists in historical_fires table');
      return;
    }
    
    // Add barangay column
    await pool.query(`
      ALTER TABLE historical_fires 
      ADD COLUMN barangay VARCHAR(255)
    `);
    
    console.log('✅ Successfully added barangay column to historical_fires table');
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_fires_barangay 
      ON historical_fires(barangay)
    `);
    
    console.log('✅ Created index on barangay column for performance');
    
    // Show current table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'historical_fires'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated historical_fires table structure:');
    console.table(tableStructure.rows);
    
  } catch (error) {
    console.error('❌ Error adding barangay column:', error);
  } finally {
    // Don't end the pool since it's shared - just exit gracefully
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  addBarangayColumn();
}

module.exports = { addBarangayColumn };