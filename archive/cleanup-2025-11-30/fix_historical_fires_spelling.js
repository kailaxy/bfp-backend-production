const pool = require('./db');

async function updateHistoricalFires() {
  try {
    console.log('Updating historical_fires to use "Hagdang" (with g)...\n');
    
    const update1 = await pool.query(`
      UPDATE historical_fires 
      SET barangay = 'Hagdang Bato Itaas'
      WHERE barangay = 'Hagdan Bato Itaas'
    `);
    console.log(`Updated ${update1.rowCount} historical fire rows for Itaas`);
    
    const update2 = await pool.query(`
      UPDATE historical_fires 
      SET barangay = 'Hagdang Bato Libis'
      WHERE barangay = 'Hagdan Bato Libis'
    `);
    console.log(`Updated ${update2.rowCount} historical fire rows for Libis`);
    
    // Verify
    const check = await pool.query(`
      SELECT DISTINCT barangay FROM historical_fires 
      WHERE barangay LIKE '%Hagda%'
      ORDER BY barangay
    `);
    console.log('\nHistorical fires now have:', check.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

updateHistoricalFires();
