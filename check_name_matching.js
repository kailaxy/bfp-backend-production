const db = require('./config/db');

async function checkNameMatching() {
  try {
    console.log('🔍 Checking barangay name consistency...\n');
    
    // Get all barangay names from forecasts
    const forecasts = await db.query(`
      SELECT DISTINCT barangay_name 
      FROM forecasts 
      ORDER BY barangay_name
    `);
    
    // Get all barangay names from boundaries
    const boundaries = await db.query(`
      SELECT DISTINCT name 
      FROM barangays 
      ORDER BY name
    `);
    
    console.log('📊 Forecast barangay names:', forecasts.rows.length);
    console.log('📊 Boundary barangay names:', boundaries.rows.length);
    console.log('\n');
    
    const fNames = forecasts.rows.map(r => r.barangay_name);
    const bNames = boundaries.rows.map(r => r.name);
    
    console.log('─'.repeat(80));
    console.log('Forecast Name'.padEnd(35) + ' | ' + 'Boundary Name'.padEnd(35));
    console.log('─'.repeat(80));
    
    // Check each forecast name
    let mismatches = [];
    fNames.forEach(fName => {
      const exactMatch = bNames.find(b => b === fName);
      const caseInsensitiveMatch = bNames.find(b => b.toLowerCase() === fName.toLowerCase());
      
      if (exactMatch) {
        console.log(fName.padEnd(35) + ' | ✅ ' + exactMatch);
      } else if (caseInsensitiveMatch) {
        console.log(fName.padEnd(35) + ' | ⚠️  ' + caseInsensitiveMatch + ' (CASE MISMATCH)');
        mismatches.push({ forecast: fName, boundary: caseInsensitiveMatch });
      } else {
        console.log(fName.padEnd(35) + ' | ❌ NOT FOUND');
        mismatches.push({ forecast: fName, boundary: null });
      }
    });
    
    console.log('─'.repeat(80));
    
    // Check for boundaries without forecasts
    console.log('\n📊 Boundaries without forecasts:');
    const missingForecasts = bNames.filter(b => !fNames.find(f => f.toLowerCase() === b.toLowerCase()));
    if (missingForecasts.length > 0) {
      missingForecasts.forEach(name => {
        console.log(`   ❌ ${name}`);
      });
    } else {
      console.log('   ✅ All boundaries have forecasts');
    }
    
    if (mismatches.length > 0) {
      console.log('\n⚠️  MISMATCHES FOUND:');
      console.log('─'.repeat(80));
      mismatches.forEach(m => {
        console.log(`   Forecast: "${m.forecast}"`);
        console.log(`   Boundary: "${m.boundary || 'NOT FOUND'}"`);
        console.log('');
      });
    } else {
      console.log('\n✅ All names match perfectly!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNameMatching();
