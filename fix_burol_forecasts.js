const db = require('./config/db');

async function fixBurolForecasts() {
  try {
    console.log('🔧 Fixing Burol negative/near-zero forecasts...\n');
    
    // Check current Burol data
    console.log('📊 Current Burol forecasts:');
    const beforeData = await db.query(`
      SELECT year, month, predicted_cases, lower_bound, upper_bound, risk_level
      FROM forecasts
      WHERE barangay_name = 'Burol'
      ORDER BY year, month
    `);
    
    console.log('─'.repeat(80));
    beforeData.rows.forEach(row => {
      console.log(`${row.year}-${String(row.month).padStart(2, '0')}: predicted=${Number(row.predicted_cases).toFixed(6)}, risk=${row.risk_level}`);
    });
    console.log('─'.repeat(80));
    
    // Update negative/near-zero values to 0
    // Also recalculate risk_level based on the corrected values
    const updateResult = await db.query(`
      UPDATE forecasts
      SET 
        predicted_cases = GREATEST(predicted_cases, 0),
        lower_bound = GREATEST(lower_bound, 0),
        risk_level = CASE
          WHEN GREATEST(predicted_cases, 0) >= 1 THEN 'High'
          WHEN GREATEST(predicted_cases, 0) >= 0.5 THEN 'Medium'
          WHEN GREATEST(predicted_cases, 0) >= 0.2 THEN 'Low-Moderate'
          ELSE 'Very Low'
        END
      WHERE barangay_name = 'Burol'
        AND predicted_cases < 0.001
    `);
    
    console.log(`\n✅ Updated ${updateResult.rowCount} Burol forecast records\n`);
    
    // Check updated data
    console.log('📊 Updated Burol forecasts:');
    const afterData = await db.query(`
      SELECT year, month, predicted_cases, lower_bound, upper_bound, risk_level
      FROM forecasts
      WHERE barangay_name = 'Burol'
      ORDER BY year, month
    `);
    
    console.log('─'.repeat(80));
    afterData.rows.forEach(row => {
      console.log(`${row.year}-${String(row.month).padStart(2, '0')}: predicted=${Number(row.predicted_cases).toFixed(6)}, risk=${row.risk_level}`);
    });
    console.log('─'.repeat(80));
    
    console.log('\n✅ Burol forecasts fixed! Should now show green (Very Low) instead of gray.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBurolForecasts();
