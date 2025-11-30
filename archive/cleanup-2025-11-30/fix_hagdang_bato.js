const pool = require('./db');

async function fixHagdangBato() {
  try {
    // Check historical_fires for correct spelling
    const historical = await pool.query(`
      SELECT DISTINCT barangay FROM historical_fires 
      WHERE barangay LIKE '%Hagda%'
      ORDER BY barangay
    `);
    console.log('Historical fires spelling:', historical.rows);
    
    // Current state in forecasts
    const forecasts = await pool.query(`
      SELECT DISTINCT barangay_name FROM forecasts 
      WHERE barangay_name LIKE '%Hagda%'
      ORDER BY barangay_name
    `);
    console.log('Forecasts spelling:', forecasts.rows);
    
    // Update forecasts to match "Hagdang" (with g) - the correct spelling
    console.log('\nUpdating forecasts to use "Hagdang" (with g)...');
    
    const update1 = await pool.query(`
      UPDATE forecasts 
      SET barangay_name = 'Hagdang Bato Itaas'
      WHERE barangay_name = 'Hagdan Bato Itaas'
    `);
    console.log(`Updated ${update1.rowCount} forecast rows for Itaas`);
    
    const update2 = await pool.query(`
      UPDATE forecasts 
      SET barangay_name = 'Hagdang Bato Libis'
      WHERE barangay_name = 'Hagdan Bato Libis'
    `);
    console.log(`Updated ${update2.rowCount} forecast rows for Libis`);
    
    // Check forecasts_graphs
    const graphCheck = await pool.query(`
      SELECT barangay, COUNT(*) as count
      FROM forecasts_graphs 
      WHERE barangay LIKE '%Hagda%'
      GROUP BY barangay
    `);
    console.log('\nForecasts_graphs:', graphCheck.rows);
    
    // Delete old "Hagdan" entries (without g) from graphs
    const deleteOld1 = await pool.query(`
      DELETE FROM forecasts_graphs 
      WHERE barangay = 'Hagdan Bato Itaas'
    `);
    console.log(`Deleted ${deleteOld1.rowCount} old graph rows for Itaas`);
    
    const deleteOld2 = await pool.query(`
      DELETE FROM forecasts_graphs 
      WHERE barangay = 'Hagdan Bato Libis'
    `);
    console.log(`Deleted ${deleteOld2.rowCount} old graph rows for Libis`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

fixHagdangBato();
