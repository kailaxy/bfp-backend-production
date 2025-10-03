const pool = require('../config/db');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking historical_fires table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'historical_fires'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 historical_fires table columns:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();