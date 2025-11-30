// Script to check and fix fire stations with NULL geometry
const pool = require('./config/db');

async function fixFireStationsGeometry() {
  try {
    console.log('🔍 Checking fire stations with NULL geometry...\n');
    
    // First, check if there are any stations with NULL geometry
    const checkQuery = `
      SELECT id, name, address, 
             CASE WHEN geom IS NULL THEN 'NULL' ELSE 'HAS GEOM' END as geom_status
      FROM mandaluyong_fire_stations
      ORDER BY id;
    `;
    
    const allStations = await pool.query(checkQuery);
    console.log(`📊 Total fire stations: ${allStations.rows.length}`);
    
    const nullGeomStations = allStations.rows.filter(s => s.geom_status === 'NULL');
    const hasGeomStations = allStations.rows.filter(s => s.geom_status === 'HAS GEOM');
    
    console.log(`✅ Stations WITH geometry: ${hasGeomStations.length}`);
    console.log(`❌ Stations WITHOUT geometry: ${nullGeomStations.length}\n`);
    
    if (nullGeomStations.length > 0) {
      console.log('🚨 Fire stations with NULL geometry:');
      nullGeomStations.forEach(s => {
        console.log(`   ID ${s.id}: ${s.name} - ${s.address || 'No address'}`);
      });
      
      console.log('\n⚠️  These stations need latitude/longitude to be visible on the map.');
      console.log('💡 You can update them through the Admin Fire Stations Manager by editing each station.');
    } else {
      console.log('✅ All fire stations have geometry data!');
    }
    
    // Also check if any have coordinates in a different format
    console.log('\n🔍 Checking coordinate format...');
    const coordCheck = await pool.query(`
      SELECT id, name, 
             ST_Y(ST_Centroid(geom))::float as latitude,
             ST_X(ST_Centroid(geom))::float as longitude
      FROM mandaluyong_fire_stations
      WHERE geom IS NOT NULL
      LIMIT 5;
    `);
    
    console.log('\n📍 Sample coordinates from existing stations:');
    coordCheck.rows.forEach(s => {
      console.log(`   ID ${s.id}: ${s.name}`);
      console.log(`      Lat: ${s.latitude}, Lng: ${s.longitude}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

fixFireStationsGeometry();
