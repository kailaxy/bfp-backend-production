const db = require('./config/db');

async function checkAndFixHagdangBato() {
  try {
    console.log('🔍 Checking Hagdang Bato barangay names in forecasts table...\n');
    
    // Check current state of both variations
    console.log('📊 Current state:');
    console.log('─'.repeat(80));
    
    const checkHagdan = await db.query(`
      SELECT barangay_name, COUNT(*) as count
      FROM forecasts
      WHERE barangay_name ILIKE '%hagdan%'
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    if (checkHagdan.rows.length === 0) {
      console.log('❌ No records found with "Hagdan" or "Hagdang" in the name');
    } else {
      console.log('Found barangay names:');
      checkHagdan.rows.forEach(row => {
        console.log(`  - ${row.barangay_name}: ${row.count} forecast records`);
      });
    }
    
    console.log('\n🔧 Checking for mismatches (using "Hagdan" instead of "Hagdang")...\n');
    
    // Check if there are any with wrong spelling
    const wrongSpelling = await db.query(`
      SELECT COUNT(*) as count
      FROM forecasts
      WHERE barangay_name IN ('Hagdan Bato Libis', 'Hagdan Bato Itaas')
    `);
    
    if (wrongSpelling.rows[0].count > 0) {
      console.log(`⚠️  Found ${wrongSpelling.rows[0].count} records with incorrect spelling ("Hagdan" instead of "Hagdang")`);
      console.log('\n📝 Fixing barangay names...\n');
      
      // Fix Hagdan Bato Libis → Hagdang Bato Libis
      const fix1 = await db.query(`
        UPDATE forecasts 
        SET barangay_name = 'Hagdang Bato Libis'
        WHERE barangay_name = 'Hagdan Bato Libis'
        RETURNING id
      `);
      console.log(`✅ Fixed "Hagdan Bato Libis" → "Hagdang Bato Libis": ${fix1.rowCount} records`);
      
      // Fix Hagdan Bato Itaas → Hagdang Bato Itaas
      const fix2 = await db.query(`
        UPDATE forecasts 
        SET barangay_name = 'Hagdang Bato Itaas'
        WHERE barangay_name = 'Hagdan Bato Itaas'
        RETURNING id
      `);
      console.log(`✅ Fixed "Hagdan Bato Itaas" → "Hagdang Bato Itaas": ${fix2.rowCount} records`);
      
      console.log('\n✨ All barangay names have been corrected!\n');
    } else {
      console.log('✅ All barangay names are already correct! No changes needed.\n');
    }
    
    // Verify final state
    console.log('📊 Final state:');
    console.log('─'.repeat(80));
    
    const finalCheck = await db.query(`
      SELECT barangay_name, COUNT(*) as count
      FROM forecasts
      WHERE barangay_name ILIKE '%hagd%'
      GROUP BY barangay_name
      ORDER BY barangay_name
    `);
    
    if (finalCheck.rows.length === 0) {
      console.log('❌ No records found');
    } else {
      finalCheck.rows.forEach(row => {
        console.log(`  - ${row.barangay_name}: ${row.count} forecast records`);
      });
    }
    
    // Also check what the frontend/map is expecting
    console.log('\n🗺️  Checking barangay names in historical_fires (what the map expects)...');
    console.log('─'.repeat(80));
    
    const historicalCheck = await db.query(`
      SELECT DISTINCT barangay_name
      FROM historical_fires
      WHERE barangay_name ILIKE '%hagd%'
      ORDER BY barangay_name
    `);
    
    if (historicalCheck.rows.length === 0) {
      console.log('❌ No records found in historical_fires');
    } else {
      console.log('Barangay names in historical_fires:');
      historicalCheck.rows.forEach(row => {
        console.log(`  - ${row.barangay_name}`);
      });
    }
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.end();
  }
}

// Run the check and fix
checkAndFixHagdangBato();
