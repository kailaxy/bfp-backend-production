// Check the actual geometry format returned by the API
const pool = require('./config/db');

async function checkGeometryFormat() {
  try {
    console.log('🔍 Checking geometry format from fire stations\n');
    
    const result = await pool.query(`
      SELECT
        id,
        name,
        ST_AsGeoJSON(geom)::json AS geometry,
        ST_GeometryType(geom) as geom_type,
        ST_Y(ST_Centroid(geom))::float AS latitude,
        ST_X(ST_Centroid(geom))::float AS longitude
      FROM mandaluyong_fire_stations
      WHERE geom IS NOT NULL
      LIMIT 3
    `);
    
    console.log('📊 Sample geometry data:\n');
    result.rows.forEach(station => {
      console.log(`Station: ${station.name}`);
      console.log(`Geometry Type: ${station.geom_type}`);
      console.log(`Geometry JSON:`, JSON.stringify(station.geometry, null, 2));
      console.log(`Extracted Lat/Lng: ${station.latitude}, ${station.longitude}`);
      console.log('─'.repeat(60));
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkGeometryFormat();
