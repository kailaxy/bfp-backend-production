// Detailed check of fire stations table
const pool = require('./config/db');

async function detailedCheck() {
  try {
    console.log('🔍 Detailed Fire Stations Check\n');
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM mandaluyong_fire_stations');
    console.log(`📊 Total records in table: ${countResult.rows[0].total}\n`);
    
    // Get all stations with full details
    const allStations = await pool.query(`
      SELECT 
        id, 
        name, 
        operator,
        address,
        contact_phone,
        CASE WHEN geom IS NULL THEN 'NULL' ELSE 'EXISTS' END as geom_status,
        CASE WHEN geom IS NULL THEN NULL ELSE ST_Y(ST_Centroid(geom))::float END AS latitude,
        CASE WHEN geom IS NULL THEN NULL ELSE ST_X(ST_Centroid(geom))::float END AS longitude
      FROM mandaluyong_fire_stations
      ORDER BY id
    `);
    
    console.log('📋 All Fire Stations:\n');
    allStations.rows.forEach((station, index) => {
      console.log(`${index + 1}. ID ${station.id}: ${station.name || 'NO NAME'}`);
      console.log(`   Operator: ${station.operator || 'N/A'}`);
      console.log(`   Address: ${station.address || 'N/A'}`);
      console.log(`   Geometry: ${station.geom_status}`);
      if (station.latitude && station.longitude) {
        console.log(`   Coordinates: ${station.latitude}, ${station.longitude}`);
      }
      console.log('');
    });
    
    // Check what the map endpoint would return
    const mapQuery = await pool.query(`
      SELECT
        id,
        name,
        CASE 
          WHEN geom IS NOT NULL THEN 'WILL SHOW ON MAP'
          ELSE 'HIDDEN (NULL GEOM)'
        END as map_status
      FROM mandaluyong_fire_stations
      ORDER BY id
    `);
    
    const visibleCount = mapQuery.rows.filter(r => r.map_status === 'WILL SHOW ON MAP').length;
    const hiddenCount = mapQuery.rows.filter(r => r.map_status === 'HIDDEN (NULL GEOM)').length;
    
    console.log('='.repeat(60));
    console.log(`\n🗺️  MAP VISIBILITY STATUS:`);
    console.log(`   ✅ Visible on map: ${visibleCount}`);
    console.log(`   ❌ Hidden from map: ${hiddenCount}\n`);
    
    if (hiddenCount > 0) {
      console.log('🚨 Hidden stations:');
      mapQuery.rows
        .filter(r => r.map_status === 'HIDDEN (NULL GEOM)')
        .forEach(s => console.log(`   - ID ${s.id}: ${s.name}`));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

detailedCheck();
