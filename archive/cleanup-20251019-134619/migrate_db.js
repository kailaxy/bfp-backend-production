/**
 * Migrate database from Render to Railway using Node.js pg-copy-streams
 * This avoids needing pg_dump/psql installed
 */

const { Pool } = require('pg');
const fs = require('fs');

// Use environment-provided connection strings. Do not rely on embedded credentials.
const renderConnectionString = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;
const railwayConnectionString = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!renderConnectionString) {
  console.error('❌ ERROR: RENDER_DATABASE_URL or DATABASE_URL (Render) not set.');
  process.exit(1);
}

const renderPool = new Pool({
  connectionString: renderConnectionString,
  ssl: { rejectUnauthorized: false }
});

const railwayPool = new Pool({
  connectionString: railwayConnectionString,
  ssl: { rejectUnauthorized: false }
});

async function getTables() {
  const result = await renderPool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map(r => r.tablename);
}

async function getTableSchema(tableName) {
  const result = await renderPool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function copyTable(tableName) {
  console.log(`\n📋 Copying table: ${tableName}`);
  
  try {
    // Get all data from Render
    const data = await renderPool.query(`SELECT * FROM ${tableName}`);
    console.log(`   Found ${data.rows.length} rows`);
    
    if (data.rows.length === 0) {
      console.log(`   ⚠️  Table is empty, skipping data copy`);
      return { success: true, rows: 0 };
    }
    
    // Get column names
    const columns = data.fields.map(f => f.name);
    
    // Insert into Railway in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        const values = columns.map(col => row[col]);
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await railwayPool.query(insertQuery, values);
        insertedCount++;
      }
      
      if (i + batchSize < data.rows.length) {
        console.log(`   Progress: ${insertedCount}/${data.rows.length}`);
      }
    }
    
    console.log(`   ✅ Copied ${insertedCount} rows`);
    return { success: true, rows: insertedCount };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n=== Database Migration: Render → Railway ===\n');
  
  try {
    // Test connections
    console.log('Testing connections...');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected to Render database');
    
    await railwayPool.query('SELECT 1');
    console.log('✅ Connected to Railway database\n');
    
    // Get list of tables
    console.log('Fetching table list from Render...');
    const tables = await getTables();
    console.log(`Found ${tables.length} tables:\n  ${tables.join(', ')}\n`);
    
    // Ask for confirmation
    console.log('⚠️  WARNING: This will copy all data from Render to Railway');
    console.log('   Existing data in Railway may be overwritten\n');
    
    console.log('Starting migration...\n');
    
    const results = [];
    
    for (const table of tables) {
      const result = await copyTable(table);
      results.push({ table, ...result });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ Successful: ${successful.length} tables`);
    successful.forEach(r => {
      console.log(`   - ${r.table}: ${r.rows} rows`);
    });
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length} tables`);
      failed.forEach(r => {
        console.log(`   - ${r.table}: ${r.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await renderPool.end();
    await railwayPool.end();
  }
}

main().catch(console.error);
