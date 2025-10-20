const db = require('./config/db');

async function removeUnknownForecasts() {
  try {
    console.log('🗑️  Removing "Unknown" barangay entries from forecasts table...\n');
    
    // Show what will be deleted
    const unknownRecords = await db.query(`
      SELECT id, barangay_name, year, month, predicted_cases
      FROM forecasts
      WHERE barangay_name ILIKE '%unknown%'
      ORDER BY year, month
    `);
    
    if (unknownRecords.rows.length === 0) {
      console.log('✅ No "Unknown" entries found. Database is clean!');
      process.exit(0);
      return;
    }
    
    console.log(`Found ${unknownRecords.rows.length} "Unknown" records to delete:`);
    console.log('─'.repeat(80));
    unknownRecords.rows.forEach(row => {
      console.log(`  ID: ${row.id} | ${row.barangay_name} | ${row.year}-${String(row.month).padStart(2, '0')} | Predicted: ${row.predicted_cases}`);
    });
    
    console.log('\n⚠️  Deleting these records...');
    
    // Delete Unknown entries
    const deleteResult = await db.query(`
      DELETE FROM forecasts
      WHERE barangay_name ILIKE '%unknown%'
      RETURNING id
    `);
    
    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} "Unknown" forecast records!`);
    
    // Verify deletion
    const verifyCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM forecasts
      WHERE barangay_name ILIKE '%unknown%'
    `);
    
    if (verifyCheck.rows[0].count === 0) {
      console.log('✅ Verification: Database is now clean - no "Unknown" entries remain.');
    } else {
      console.log(`⚠️  Warning: ${verifyCheck.rows[0].count} "Unknown" entries still exist.`);
    }
    
    // Show updated total
    const totalCheck = await db.query(`
      SELECT COUNT(DISTINCT barangay_name) as unique_barangays
      FROM forecasts
    `);
    
    console.log(`\n📊 Database now has ${totalCheck.rows[0].unique_barangays} unique barangays (should be 27).`);
    
    console.log('\n✨ Cleanup complete!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

removeUnknownForecasts();
