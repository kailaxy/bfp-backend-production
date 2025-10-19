const db = require('./config/db');

async function fixBarangayNames() {
  try {
    console.log('🔧 Fixing barangay names in forecasts table...\n');
    
    // Update Hagdan Bato Libis to Hagdang Bato Libis
    const result1 = await db.query(`
      UPDATE forecasts 
      SET barangay_name = 'Hagdang Bato Libis'
      WHERE barangay_name = 'Hagdan Bato Libis'
    `);
    console.log(`✅ Updated ${result1.rowCount} records: Hagdan Bato Libis → Hagdang Bato Libis`);
    
    // Update Hagdan Bato Itaas to Hagdang Bato Itaas
    const result2 = await db.query(`
      UPDATE forecasts 
      SET barangay_name = 'Hagdang Bato Itaas'
      WHERE barangay_name = 'Hagdan Bato Itaas'
    `);
    console.log(`✅ Updated ${result2.rowCount} records: Hagdan Bato Itaas → Hagdang Bato Itaas`);
    
    // Check Burol data
    console.log('\n� Checking Burol forecast data...');
    const burolData = await db.query(`
      SELECT 
        year,
        month,
        predicted_cases,
        lower_bound,
        upper_bound,
        risk_level,
        risk_flag,
        model_used
      FROM forecasts
      WHERE barangay_name = 'Burol'
      ORDER BY year, month
      LIMIT 5
    `);
    
    console.log('─'.repeat(100));
    console.log('Burol Forecasts (first 5 months):');
    console.log('─'.repeat(100));
    burolData.rows.forEach(row => {
      console.log(`${row.year}-${String(row.month).padStart(2, '0')}: predicted=${row.predicted_cases}, lower=${row.lower_bound}, upper=${row.upper_bound}, risk=${row.risk_level}, flag=${row.risk_flag}`);
    });
    console.log('─'.repeat(100));
    
    // Check all forecasts summary
    console.log('\n📊 All Barangays Forecast Summary:');
    const summary = await db.query(`
      SELECT 
        barangay_name,
        COUNT(*) as count,
        MIN(predicted_cases) as min_pred,
        MAX(predicted_cases) as max_pred,
        AVG(predicted_cases) as avg_pred
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    console.log('─'.repeat(100));
    console.log('Barangay'.padEnd(30) + 'Count'.padEnd(10) + 'Min'.padEnd(10) + 'Max'.padEnd(10) + 'Avg');
    console.log('─'.repeat(100));
    summary.rows.forEach(row => {
      console.log(
        row.barangay_name.padEnd(30) +
        String(row.count).padEnd(10) +
        Number(row.min_pred).toFixed(3).padEnd(10) +
        Number(row.max_pred).toFixed(3).padEnd(10) +
        Number(row.avg_pred).toFixed(3)
      );
    });
    console.log('─'.repeat(100));
    
    console.log('\n✅ Barangay names fixed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBarangayNames();
