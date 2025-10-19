const db = require('./config/db');

async function fixZanigaNames() {
  try {
    console.log('🔧 Fixing Zañiga names and checking Wack-Wack...\n');
    
    // Fix New Zaniga to New Zañiga
    const result1 = await db.query(`
      UPDATE forecasts 
      SET barangay_name = 'New Zañiga'
      WHERE barangay_name = 'New Zaniga'
    `);
    console.log(`✅ Updated ${result1.rowCount} records: New Zaniga → New Zañiga`);
    
    // Fix Old Zaniga to Old Zañiga
    const result2 = await db.query(`
      UPDATE forecasts 
      SET barangay_name = 'Old Zañiga'
      WHERE barangay_name = 'Old Zaniga'
    `);
    console.log(`✅ Updated ${result2.rowCount} records: Old Zaniga → Old Zañiga`);
    
    // Check for Wack-Wack Greenhills variants
    console.log('\n🔍 Checking Wack-Wack Greenhills variants...');
    const wackWackCheck = await db.query(`
      SELECT barangay_name, COUNT(*) as count
      FROM forecasts
      WHERE barangay_name ILIKE '%wack%'
      GROUP BY barangay_name
    `);
    
    if (wackWackCheck.rows.length > 0) {
      console.log('Found variants:');
      wackWackCheck.rows.forEach(row => {
        console.log(`   "${row.barangay_name}": ${row.count} records`);
      });
      
      // Check what the boundary name is
      const boundaryCheck = await db.query(`
        SELECT name FROM barangays WHERE name ILIKE '%wack%'
      `);
      console.log('\nBoundary name:', boundaryCheck.rows[0].name);
      
      // Update to match boundary
      const result3 = await db.query(`
        UPDATE forecasts 
        SET barangay_name = 'Wack-Wack Greenhills'
        WHERE barangay_name ILIKE '%wack%' AND barangay_name != 'Wack-Wack Greenhills'
      `);
      console.log(`✅ Updated ${result3.rowCount} records to "Wack-Wack Greenhills"`);
    } else {
      console.log('❌ No Wack-Wack Greenhills forecast found!');
      console.log('⚠️  This barangay is missing from the Colab results.');
    }
    
    // Final verification
    console.log('\n📊 Final verification:');
    const forecasts = await db.query(`
      SELECT DISTINCT barangay_name 
      FROM forecasts 
      ORDER BY barangay_name
    `);
    
    const boundaries = await db.query(`
      SELECT DISTINCT name 
      FROM barangays 
      ORDER BY name
    `);
    
    const fNames = forecasts.rows.map(r => r.barangay_name);
    const bNames = boundaries.rows.map(r => r.name);
    
    console.log('\nForecast barangays:', fNames.length);
    console.log('Boundary barangays:', bNames.length);
    
    const missingInForecasts = bNames.filter(b => !fNames.includes(b));
    const missingInBoundaries = fNames.filter(f => !bNames.includes(f));
    
    if (missingInForecasts.length > 0) {
      console.log('\n⚠️  Boundaries without forecasts:');
      missingInForecasts.forEach(name => console.log(`   - ${name}`));
    }
    
    if (missingInBoundaries.length > 0) {
      console.log('\n⚠️  Forecasts without boundaries:');
      missingInBoundaries.forEach(name => console.log(`   - ${name}`));
    }
    
    if (missingInForecasts.length === 0 && missingInBoundaries.length === 0) {
      console.log('\n✅ Perfect match! All 27 barangays aligned.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixZanigaNames();
