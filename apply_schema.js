// apply_schema.js
// Apply schema to Railway database
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DB_URL) {
  console.error('❌ RAILWAY_DATABASE_URL not set!');
  process.exit(1);
}

const railwayPool = new Pool({
  connectionString: RAILWAY_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function applySchema() {
  console.log('📥 Applying schema to Railway database...\n');
  
  try {
    // Read schema file
    if (!fs.existsSync('railway_schema.sql')) {
      console.error('❌ railway_schema.sql not found!');
      console.log('Run: node export_schema.js first\n');
      process.exit(1);
    }
    
    let schemaSQL = fs.readFileSync('railway_schema.sql', 'utf8');
    
    // Replace geometry types with text (Railway doesn't have PostGIS by default)
    console.log('Converting PostGIS geometry columns to text...');
    schemaSQL = schemaSQL.replace('CREATE EXTENSION IF NOT EXISTS postgis;', '-- PostGIS not available, using text for geometry columns');
    schemaSQL = schemaSQL.replace(/\s+geometry\b/g, ' text');
    schemaSQL = schemaSQL.replace(/_text\[\]/g, 'text[]');
    
    // Apply schema
    await railwayPool.query(schemaSQL);
    
    console.log('✅ Schema applied successfully!\n');
    console.log('⚠️  Note: Geometry columns converted to TEXT');
    console.log('   (Geospatial queries won\'t work, but data will be preserved)\n');
    console.log('Next step:');
    console.log('Run: node migrate_database.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await railwayPool.end();
  }
}

applySchema();
