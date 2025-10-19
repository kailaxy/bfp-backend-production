const db = require('./config/db');

async function checkUnknownForecasts() {
  try {
    console.log('🔍 Checking for "Unknown" barangay entries in forecasts table...\n');
    
    // Check for Unknown entries
    const unknownCheck = await db.query(`
      SELECT barangay_name, COUNT(*) as count
      FROM forecasts
      WHERE barangay_name ILIKE '%unknown%'
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    if (unknownCheck.rows.length === 0) {
      console.log('✅ No "Unknown" entries found in forecasts table!');
    } else {
      console.log('⚠️  Found "Unknown" entries:');
      console.log('─'.repeat(80));
      unknownCheck.rows.forEach(row => {
        console.log(`  - ${row.barangay_name}: ${row.count} records`);
      });
      console.log('\n💡 These entries should be cleaned up or corrected.');
    }
    
    // Show total barangay count
    console.log('\n📊 All unique barangays in forecasts table:');
    console.log('─'.repeat(80));
    const allBarangays = await db.query(`
      SELECT barangay_name, COUNT(*) as record_count
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    console.log(`Total unique barangays: ${allBarangays.rows.length}\n`);
    allBarangays.rows.forEach(row => {
      console.log(`  ${row.barangay_name}: ${row.record_count} records`);
    });
    
    console.log('\n✅ Check complete!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkUnknownForecasts();
