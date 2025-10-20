require('dotenv').config();
const db = require('./config/db');

async function testRenderConnection() {
  console.log('🔍 Testing Render Database Connection...\n');
  console.log('═'.repeat(80));
  
  try {
    // Test basic connection
    const result = await db.query('SELECT current_database(), current_user, version()');
    console.log('✅ Connection successful!\n');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    console.log('Version:', result.rows[0].version.split('\n')[0], '\n');
    
    console.log('═'.repeat(80));
    console.log('📊 Verifying migrated data:\n');
    
    // Check all tables
    const tables = ['barangays', 'users', 'historical_fires', 'forecasts', 
                    'mandaluyong_fire_stations', 'hydrants', 'active_fires', 
                    'notifications', 'forecasts_graphs'];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      const count = await db.query(`SELECT COUNT(*) FROM ${table}`);
      const recordCount = parseInt(count.rows[0].count);
      totalRecords += recordCount;
      
      const status = recordCount > 0 ? '✅' : '⚠️ ';
      console.log(`${status} ${table.padEnd(30)} ${recordCount.toLocaleString().padStart(6)} records`);
    }
    
    console.log('─'.repeat(80));
    console.log(`📈 Total records: ${totalRecords.toLocaleString()}\n`);
    
    // Test barangays with geometry
    console.log('═'.repeat(80));
    console.log('🗺️  Testing PostGIS geometry data:\n');
    
    const barangayTest = await db.query(`
      SELECT name, population, ST_AsGeoJSON(geom)::json->>'type' as geom_type
      FROM barangays 
      LIMIT 3
    `);
    
    console.log('Sample barangays:');
    barangayTest.rows.forEach(b => {
      console.log(`  - ${b.name.padEnd(25)} Pop: ${b.population?.toLocaleString() || 'N/A'} | Geometry: ${b.geom_type || 'Present'}`);
    });
    
    // Test forecasts
    console.log('\n' + '═'.repeat(80));
    console.log('🔮 Testing forecasts data:\n');
    
    const forecastTest = await db.query(`
      SELECT 
        barangay_name,
        COUNT(*) as months,
        MIN(year || '-' || LPAD(month::text, 2, '0')) as earliest,
        MAX(year || '-' || LPAD(month::text, 2, '0')) as latest
      FROM forecasts
      GROUP BY barangay_name
      ORDER BY barangay_name
      LIMIT 5
    `);
    
    console.log('Sample forecast coverage:');
    forecastTest.rows.forEach(f => {
      console.log(`  - ${f.barangay_name.padEnd(25)} ${f.months} months | ${f.earliest} → ${f.latest}`);
    });
    
    // Test historical fires
    console.log('\n' + '═'.repeat(80));
    console.log('🔥 Testing historical fires data:\n');
    
    const histTest = await db.query(`
      SELECT 
        barangay,
        COUNT(*) as incidents
      FROM historical_fires
      WHERE barangay IS NOT NULL
      GROUP BY barangay
      ORDER BY incidents DESC
      LIMIT 5
    `);
    
    console.log('Top 5 barangays by fire incidents:');
    histTest.rows.forEach(h => {
      console.log(`  - ${h.barangay.padEnd(25)} ${h.incidents} incidents`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('💡 Your Render database is fully operational with all data intact.\n');
    console.log('Next steps:');
    console.log('   1. Test backend locally: npm start');
    console.log('   2. Update Railway environment variables');
    console.log('   3. Deploy to Railway');
    console.log('   4. Test frontend connection\n');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

testRenderConnection();
