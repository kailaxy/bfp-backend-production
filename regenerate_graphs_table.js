const db = require('./config/db');

async function regenerateGraphsTable() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔧 Regenerating forecasts_graphs table from updated forecasts...\n');
    
    await client.query('BEGIN');
    
    // 1. Clear the old data
    console.log('🗑️  Clearing old forecasts_graphs data...');
    const deleteResult = await client.query('DELETE FROM forecasts_graphs WHERE record_type = $1', ['forecast']);
    console.log(`   Deleted ${deleteResult.rowCount} old forecast records\n`);
    
    // 2. Insert new forecast data from the forecasts table
    console.log('💾 Inserting updated forecast data...');
    const insertResult = await client.query(`
      INSERT INTO forecasts_graphs (barangay, record_type, date, value)
      SELECT 
        barangay_name,
        'forecast' as record_type,
        DATE(year || '-' || LPAD(month::text, 2, '0') || '-01') as date,
        predicted_cases as value
      FROM forecasts
      ORDER BY barangay_name, year, month
    `);
    console.log(`   Inserted ${insertResult.rowCount} new forecast records\n`);
    
    await client.query('COMMIT');
    
    // 3. Verify Addition Hills
    console.log('✅ Verifying Addition Hills data:');
    const verify = await client.query(`
      SELECT 
        date,
        value
      FROM forecasts_graphs
      WHERE barangay = 'Addition Hills'
        AND record_type = 'forecast'
      ORDER BY date
      LIMIT 5
    `);
    
    console.log('─'.repeat(80));
    verify.rows.forEach(row => {
      const date = new Date(row.date);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      console.log(`   ${monthYear}: ${Number(row.value).toFixed(3)}`);
    });
    console.log('─'.repeat(80));
    
    console.log('\n✅ Graph data regenerated! The frontend should now show updated values.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

regenerateGraphsTable();
