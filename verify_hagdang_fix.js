const db = require('./config/db');

async function verifyFix() {
  try {
    console.log('🔍 Verifying Hagdang Bato fix...\n');
    
    // Check forecasts table
    const forecastsCheck = await db.query(`
      SELECT barangay_name, year, month, predicted_cases, risk_level
      FROM forecasts
      WHERE barangay_name IN ('Hagdang Bato Libis', 'Hagdang Bato Itaas')
      ORDER BY barangay_name, year, month
      LIMIT 5
    `);
    
    console.log('✅ Forecasts Table - Sample Records:');
    console.log('─'.repeat(80));
    forecastsCheck.rows.forEach(row => {
      console.log(`${row.barangay_name} | ${row.year}-${String(row.month).padStart(2, '0')} | Predicted: ${row.predicted_cases} | Risk: ${row.risk_level}`);
    });
    
    console.log('\n📊 Total forecast records by barangay:');
    const countCheck = await db.query(`
      SELECT barangay_name, COUNT(*) as total
      FROM forecasts
      WHERE barangay_name ILIKE '%hagdang%'
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    countCheck.rows.forEach(row => {
      console.log(`  ${row.barangay_name}: ${row.total} records`);
    });
    
    console.log('\n✅ Verification complete! The Fire Risk Map should now display forecasts for these barangays correctly.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyFix();
