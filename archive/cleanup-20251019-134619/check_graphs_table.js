const db = require('./config/db');

async function checkGraphsTable() {
  try {
    console.log('🔍 Checking forecasts_graphs table...\n');
    
    // Check if table exists and has data
    const tableCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM forecasts_graphs
    `);
    
    console.log(`Total records in forecasts_graphs: ${tableCheck.rows[0].count}\n`);
    
    // Check Addition Hills specifically
    const additionHills = await db.query(`
      SELECT 
        record_type,
        date,
        value
      FROM forecasts_graphs
      WHERE barangay = 'Addition Hills'
        AND record_type = 'forecast'
      ORDER BY date
      LIMIT 5
    `);
    
    console.log('Addition Hills forecast data from forecasts_graphs:');
    console.log('─'.repeat(80));
    additionHills.rows.forEach(row => {
      console.log(`${row.date}: ${row.value}`);
    });
    console.log('─'.repeat(80));
    
    // Check what barangays exist in forecasts_graphs
    const barangays = await db.query(`
      SELECT DISTINCT barangay
      FROM forecasts_graphs
      ORDER BY barangay
    `);
    
    console.log(`\nBarangays in forecasts_graphs: ${barangays.rows.length}`);
    barangays.rows.forEach(row => {
      console.log(`  - ${row.barangay}`);
    });
    
    // Compare with forecasts table
    console.log('\n📊 Comparing with forecasts table:');
    const forecastsBarangays = await db.query(`
      SELECT DISTINCT barangay_name
      FROM forecasts
      ORDER BY barangay_name
    `);
    
    console.log(`Barangays in forecasts table: ${forecastsBarangays.rows.length}`);
    
    const graphBarangays = barangays.rows.map(r => r.barangay);
    const forecastBarangays = forecastsBarangays.rows.map(r => r.barangay_name);
    
    const missingInGraph = forecastBarangays.filter(b => !graphBarangays.includes(b));
    if (missingInGraph.length > 0) {
      console.log('\n⚠️  Barangays in forecasts but NOT in forecasts_graphs:');
      missingInGraph.forEach(name => console.log(`   - ${name}`));
    }
    
    console.log('\n💡 The graph is showing old data because it reads from forecasts_graphs table.');
    console.log('💡 We need to regenerate the forecasts_graphs table from the updated forecasts.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGraphsTable();
