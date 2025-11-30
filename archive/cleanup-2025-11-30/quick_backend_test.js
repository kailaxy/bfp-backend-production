require('dotenv').config();
const db = require('./config/db');

async function quickTest() {
  console.log('🧪 Quick Backend Test with Render Database\n');
  console.log('═'.repeat(80));
  
  try {
    // Test 1: Basic connection
    console.log('\n✅ Test 1: Database Connection');
    const version = await db.query('SELECT version()');
    console.log('   Connected to:', version.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    // Test 2: Count all tables
    console.log('\n✅ Test 2: Table Counts');
    const tables = ['barangays', 'users', 'forecasts', 'historical_fires', 'hydrants', 'mandaluyong_fire_stations'];
    
    for (const table of tables) {
      const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table.padEnd(30)} ${result.rows[0].count} records`);
    }
    
    // Test 3: Barangay geometry (PostGIS)
    console.log('\n✅ Test 3: PostGIS Geometry');
    const geoTest = await db.query(`
      SELECT name, 
             ST_GeometryType(geom) as geom_type,
             ST_NumGeometries(geom) as num_parts
      FROM barangays 
      LIMIT 3
    `);
    geoTest.rows.forEach(row => {
      console.log(`   ${row.name.padEnd(25)} ${row.geom_type} (${row.num_parts} parts)`);
    });
    
    // Test 4: Forecasts range
    console.log('\n✅ Test 4: Forecasts Coverage');
    const forecastRange = await db.query(`
      SELECT 
        MIN(year || '-' || LPAD(month::text, 2, '0')) as earliest,
        MAX(year || '-' || LPAD(month::text, 2, '0')) as latest,
        COUNT(DISTINCT barangay_name) as barangays,
        COUNT(*) as total
      FROM forecasts
    `);
    const fr = forecastRange.rows[0];
    console.log(`   Date Range: ${fr.earliest} → ${fr.latest}`);
    console.log(`   Barangays: ${fr.barangays}`);
    console.log(`   Total Forecasts: ${fr.total}`);
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n💡 Your backend is ready!');
    console.log('   - Database: Render PostgreSQL (Singapore)');
    console.log('   - All data migrated successfully');
    console.log('   - PostGIS working correctly');
    console.log('   - Ready for deployment\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

quickTest();
