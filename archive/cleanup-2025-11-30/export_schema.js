// export_schema.js
// Export database schema from Render as SQL
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const RENDER_DB_URL = process.env.RENDER_DATABASE_URL || 
  'postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2';

const renderPool = new Pool({
  connectionString: RENDER_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function exportSchema() {
  console.log('📤 Exporting schema from Render database...\n');
  
  try {
    // First, install PostGIS extension
    let schemaSQL = `-- Database Schema Export from Render
-- Generated: ${new Date().toISOString()}
-- 
-- Run this on Railway database first, then run migrate_database.js

-- Enable PostGIS extension (for geometry columns)
CREATE EXTENSION IF NOT EXISTS postgis;

`;
    
    // Get all tables
    const tablesResult = await renderPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
      ORDER BY tablename;
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables to export...\n`);
    
    // Export sequences first
    console.log('Exporting sequences...');
    const sequencesResult = await renderPool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences
      WHERE sequence_schema = 'public';
    `);
    
    for (const { sequence_name } of sequencesResult.rows) {
      schemaSQL += `CREATE SEQUENCE IF NOT EXISTS ${sequence_name};\n`;
    }
    schemaSQL += '\n';
    
    // For each table, get a proper CREATE TABLE statement
    for (const { tablename } of tablesResult.rows) {
      console.log(`Exporting: ${tablename}`);
      
      // Get columns with proper type handling
      const columnsResult = await renderPool.query(`
        SELECT 
          column_name,
          CASE 
            WHEN data_type = 'USER-DEFINED' AND udt_name = 'geometry' THEN 'geometry'
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL 
              THEN 'character varying(' || character_maximum_length || ')'
            ELSE data_type 
          END as full_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tablename]);
      
      schemaSQL += `CREATE TABLE IF NOT EXISTS ${tablename} (\n`;
      
      const columns = columnsResult.rows.map(col => {
        let def = `  ${col.column_name} ${col.full_type}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });
      
      schemaSQL += columns.join(',\n');
      schemaSQL += '\n);\n\n';
    }
    
    // Save to file
    fs.writeFileSync('railway_schema.sql', schemaSQL);
    
    console.log('\n✅ Schema exported to railway_schema.sql');
    console.log(`📊 ${tablesResult.rows.length} tables exported\n`);
    console.log('Next steps:');
    console.log('1. Review railway_schema.sql');
    console.log('2. Apply to Railway: node apply_schema.js');
    console.log('3. Run migration: node migrate_database.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await renderPool.end();
  }
}

exportSchema();
