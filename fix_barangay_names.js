const db = require('./config/db');

async function fixBarangayNames() {
  try {
    console.log('🔧 Fixing barangay name inconsistencies in forecasts table...\n');
    
    // Delete duplicate: Wack-wack Greenhills (incorrect casing)
    // The correct one "Wack-Wack Greenhills" already exists
    const result = await db.query(
      "DELETE FROM forecasts WHERE barangay_name = 'Wack-wack Greenhills'"
    );
    
    console.log(`✅ Deleted ${result.rowCount} duplicate rows with incorrect casing "Wack-wack Greenhills"\n`);
    
    // Verify the fix
    console.log('📊 Verifying: Checking for remaining mismatches...\n');
    
    const forecasts = await db.query('SELECT DISTINCT barangay_name FROM forecasts ORDER BY barangay_name');
    const boundaries = await db.query('SELECT name FROM barangays ORDER BY name');
    
    const fNames = forecasts.rows.map(r => r.barangay_name);
    const bNames = boundaries.rows.map(r => r.name);
    
    let hasMismatches = false;
    fNames.forEach(f => {
      const match = bNames.find(b => b.toLowerCase() === f.toLowerCase());
      if (!match) {
        console.log('  ❌ NOT FOUND:', f);
        hasMismatches = true;
      } else if (match !== f) {
        console.log('  ⚠️  CASE MISMATCH:');
        console.log('     Forecast:', f);
        console.log('     Boundary:', match);
        hasMismatches = true;
      }
    });
    
    if (!hasMismatches) {
      console.log('✅ No mismatches found! All barangay names match correctly.\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBarangayNames();
