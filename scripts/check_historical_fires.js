const db = require('../db');

async function checkHistoricalFiresTable() {
  try {
    console.log('Checking historical_fires table structure...');
    
    // Check table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'historical_fires' 
      ORDER BY ordinal_position;
    `;
    
    const structure = await db.query(structureQuery);
    console.log('\n📋 Table Structure:');
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check sample data
    const sampleQuery = 'SELECT * FROM historical_fires LIMIT 5';
    const sample = await db.query(sampleQuery);
    console.log('\n📊 Sample Data:');
    console.log(sample.rows);
    
    // Check data count and date range
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        MIN(resolved_at) as earliest_date,
        MAX(resolved_at) as latest_date,
        COUNT(DISTINCT barangay) as unique_barangays
      FROM historical_fires
    `;
    
    const stats = await db.query(statsQuery);
    console.log('\n📈 Data Statistics:');
    console.log(stats.rows[0]);
    
  } catch (error) {
    console.error('❌ Error checking historical_fires table:', error);
  } finally {
    process.exit(0);
  }
}

checkHistoricalFiresTable();