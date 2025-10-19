const db = require('./config/db');

async function analyzeProductionForecasts() {
  try {
    console.log('🔍 Analyzing production-generated forecasts for seasonality...\n');
    
    // Check if there are any production-generated forecasts (not from Colab)
    // The Colab ones were imported with specific models like "SARIMAX(2, 0, 1)+(0, 1, 1, 12)"
    
    // First, let's see what we have
    const allForecasts = await db.query(`
      SELECT 
        barangay_name,
        year,
        month,
        predicted_cases,
        model_used
      FROM forecasts
      WHERE barangay_name = 'Addition Hills'
      ORDER BY year, month
    `);
    
    console.log('Addition Hills forecasts:');
    console.log('─'.repeat(100));
    console.log('Month'.padEnd(15) + 'Predicted'.padEnd(15) + 'Model Used');
    console.log('─'.repeat(100));
    
    let variance = 0;
    let values = [];
    allForecasts.rows.forEach(row => {
      const monthStr = `${row.year}-${String(row.month).padStart(2, '0')}`;
      console.log(
        monthStr.padEnd(15) +
        Number(row.predicted_cases).toFixed(6).padEnd(15) +
        row.model_used
      );
      values.push(Number(row.predicted_cases));
    });
    
    // Calculate variance
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    console.log('─'.repeat(100));
    console.log(`\n📊 Statistics:`);
    console.log(`   Mean: ${mean.toFixed(6)}`);
    console.log(`   Std Dev: ${stdDev.toFixed(6)}`);
    console.log(`   Min: ${Math.min(...values).toFixed(6)}`);
    console.log(`   Max: ${Math.max(...values).toFixed(6)}`);
    console.log(`   Range: ${(Math.max(...values) - Math.min(...values)).toFixed(6)}`);
    
    // Check a few other barangays
    console.log('\n\n🔍 Checking other barangays for seasonality patterns:\n');
    
    const testBarangays = ['Plainview', 'Highway Hills', 'Hulo'];
    
    for (const barangay of testBarangays) {
      const data = await db.query(`
        SELECT 
          year,
          month,
          predicted_cases,
          model_used
        FROM forecasts
        WHERE barangay_name = $1
        ORDER BY year, month
        LIMIT 12
      `, [barangay]);
      
      const vals = data.rows.map(r => Number(r.predicted_cases));
      const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      const range = Math.max(...vals) - Math.min(...vals);
      
      console.log(`${barangay}:`);
      console.log(`   Values: ${vals.map(v => v.toFixed(3)).join(', ')}`);
      console.log(`   Avg: ${avg.toFixed(3)}, Range: ${range.toFixed(3)}, Model: ${data.rows[0]?.model_used || 'N/A'}`);
      console.log('');
    }
    
    console.log('\n💡 Analysis:');
    console.log('   If the Colab forecasts show good variation (range > 0.3),');
    console.log('   but production forecasts would be nearly identical,');
    console.log('   it means the production ARIMA is likely:');
    console.log('   1. Not using seasonal components properly');
    console.log('   2. Using different historical data');
    console.log('   3. Reverting to mean-based fallback');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeProductionForecasts();
