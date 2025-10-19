const db = require('./config/db');

async function checkGraphData() {
  try {
    console.log('📊 Checking forecast data for October 2025...\n');
    
    // Check all forecasts for October 2025
    const octoberData = await db.query(`
      SELECT 
        barangay_name,
        year,
        month,
        predicted_cases,
        risk_level,
        model_used
      FROM forecasts
      WHERE year = 2025 AND month = 10
      ORDER BY barangay_name
    `);
    
    console.log(`Found ${octoberData.rows.length} barangays for October 2025\n`);
    console.log('─'.repeat(100));
    console.log('Barangay'.padEnd(30) + 'Predicted Cases'.padEnd(20) + 'Risk Level'.padEnd(15) + 'Model');
    console.log('─'.repeat(100));
    
    octoberData.rows.forEach(row => {
      console.log(
        row.barangay_name.padEnd(30) +
        Number(row.predicted_cases).toFixed(3).padEnd(20) +
        row.risk_level.padEnd(15) +
        row.model_used
      );
    });
    console.log('─'.repeat(100));
    
    // Check Addition Hills specifically
    console.log('\n🔍 Addition Hills forecast details:');
    const additionHills = await db.query(`
      SELECT *
      FROM forecasts
      WHERE barangay_name = 'Addition Hills' AND year = 2025 AND month = 10
    `);
    
    if (additionHills.rows.length > 0) {
      const data = additionHills.rows[0];
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Check if there are any old forecasts that might be interfering
    console.log('\n🔍 Checking for duplicate or old forecasts...');
    const duplicates = await db.query(`
      SELECT 
        barangay_name,
        year,
        month,
        COUNT(*) as count
      FROM forecasts
      GROUP BY barangay_name, year, month
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️  Found duplicate forecasts:');
      duplicates.rows.forEach(row => {
        console.log(`   ${row.barangay_name} ${row.year}-${row.month}: ${row.count} records`);
      });
    } else {
      console.log('✅ No duplicate forecasts found');
    }
    
    // Check the forecast date range
    console.log('\n📅 Forecast date range:');
    const dateRange = await db.query(`
      SELECT 
        MIN(year) as min_year,
        MAX(year) as max_year,
        MIN(month) as min_month,
        MAX(month) as max_month
      FROM forecasts
    `);
    console.log(dateRange.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGraphData();
