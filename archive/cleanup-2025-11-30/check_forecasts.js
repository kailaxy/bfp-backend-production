const pool = require('./db');

async function checkForecasts() {
  try {
    // Check tables
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%forecast%'
      ORDER BY tablename
    `);
    console.log('Forecast tables:', tables.rows.map(r => r.tablename));
    
    // Check forecasts table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'forecasts'
      ORDER BY ordinal_position
    `);
    console.log('\nForecasts table columns:');
    columns.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
    
    // Get sample data
    const sample = await pool.query(`SELECT * FROM forecasts LIMIT 5`);
    console.log('\nSample forecasts:');
    console.log(sample.rows);
    
    // Check forecasts_graphs
    const graphColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'forecasts_graphs'
      ORDER BY ordinal_position
    `);
    console.log('\nForecasts_graphs table columns:');
    graphColumns.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
    
    const graphSample = await pool.query(`SELECT * FROM forecasts_graphs LIMIT 5`);
    console.log('\nSample forecasts_graphs:');
    console.log(graphSample.rows);
    
    // Check for Hagdang Bato
    const hagdang = await pool.query(`
      SELECT DISTINCT barangay_name 
      FROM forecasts 
      WHERE barangay_name LIKE '%Hagdang%'
      ORDER BY barangay_name
    `);
    console.log('\nHagdang Bato barangays in forecasts:');
    console.log(hagdang.rows);
    
    // Check all barangays
    const allBarangays = await pool.query(`
      SELECT DISTINCT barangay_name 
      FROM forecasts 
      ORDER BY barangay_name
    `);
    console.log('\nAll barangays in forecasts:');
    allBarangays.rows.forEach(r => console.log(`  ${r.barangay_name}`));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkForecasts();
