require('dotenv').config();
const { Pool } = require('pg');

// Source: Local PostgreSQL
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bfpmapping',
  user: 'postgres',
  password: '514db'
});

// Destination: New Render PostgreSQL
const renderPool = new Pool({
  connectionString: 'postgresql://bfpvvdatabase_user:nVnT7G0uiySygJ5AqOYFy82Abp9wfGuK@dpg-d3pq1us9c44c73c8ree0-a.singapore-postgres.render.com/bfpvvdatabase',
  ssl: { rejectUnauthorized: false }
});

async function migrateDatabase() {
  console.log('🚀 Starting Database Migration: Local → Render\n');
  console.log('═'.repeat(80));
  
  try {
    // Test connections
    console.log('📡 Testing connections...\n');
    
    const localClient = await localPool.connect();
    console.log('✅ Connected to LOCAL database (bfpmapping@localhost)');
    
    const renderClient = await renderPool.connect();
    console.log('✅ Connected to RENDER database (dpg-d3pq1us9c44c73c8ree0-a.singapore-postgres.render.com)\n');
    
    console.log('═'.repeat(80));
    console.log('📊 MIGRATION PLAN:\n');
    
    // Get table list with row counts from local
    const tables = await localClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'spatial_ref_sys'
      ORDER BY 
        CASE table_name
          WHEN 'barangays' THEN 1
          WHEN 'users' THEN 2
          WHEN 'mandaluyong_fire_stations' THEN 3
          WHEN 'hydrants' THEN 4
          WHEN 'historical_fires' THEN 5
          WHEN 'forecasts' THEN 6
          WHEN 'forecasts_graphs' THEN 7
          WHEN 'active_fires' THEN 8
          WHEN 'notifications' THEN 9
          ELSE 10
        END
    `);
    
    console.log('Tables to migrate:');
    for (const row of tables.rows) {
      const countResult = await localClient.query(`SELECT COUNT(*) FROM ${row.table_name}`);
      console.log(`  ${row.table_name.padEnd(30)} ${countResult.rows[0].count} records`);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('⚙️  STEP 1: Enable PostGIS on Render database\n');
    
    await renderClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
    console.log('✅ PostGIS extension enabled\n');
    
    console.log('═'.repeat(80));
    console.log('⚙️  STEP 2: Copy schema structure from local to Render\n');
    
    // Get table creation statements from local database
    for (const row of tables.rows) {
      const tableName = row.table_name;
      
      // Get columns and types
      const columns = await localClient.query(`
        SELECT 
          column_name, 
          data_type,
          udt_name,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      // Drop table if exists
      await renderClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      
      // Build CREATE TABLE statement
      const columnDefs = columns.rows.map(col => {
        let def = `${col.column_name} `;
        
        // Handle geometry type specially
        if (col.udt_name === 'geometry') {
          def += 'geometry';
        } else if (col.data_type === 'ARRAY') {
          def += 'text[]';
        } else if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else if (col.data_type === 'character varying') {
          def += col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar';
        } else {
          def += col.data_type;
        }
        
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) {
          // Skip defaults for now, will handle separately
        }
        
        return def;
      }).join(', ');
      
      await renderClient.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`);
      console.log(`✅ Created table: ${tableName}`);
    }
    
    console.log('');
    
    console.log('═'.repeat(80));
    console.log('⚙️  STEP 3: Migrate data table by table\n');
    
    let totalRecordsMigrated = 0;
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      console.log(`\n📦 Migrating: ${tableName}`);
      
      // Get all data from local
      const data = await localClient.query(`SELECT * FROM ${tableName}`);
      
      if (data.rows.length === 0) {
        console.log(`   ⚠️  Empty table, skipping`);
        continue;
      }
      
      console.log(`   📤 Fetched ${data.rows.length} records from local`);
      
      // Get column names
      const columns = Object.keys(data.rows[0]);
      
      // Clear existing data in destination
      await renderClient.query(`DELETE FROM ${tableName}`);
      console.log(`   🗑️  Cleared existing data in Render`);
      
      // Insert data in batches
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);
        
        for (const record of batch) {
          const values = columns.map(col => record[col]);
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          const columnNames = columns.join(', ');
          
          await renderClient.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        }
        
        process.stdout.write(`\r   📥 Inserted ${inserted}/${data.rows.length} records...`);
      }
      
      console.log(`\n   ✅ Completed: ${inserted} records migrated`);
      totalRecordsMigrated += inserted;
      
      // Verify count
      const verifyResult = await renderClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const renderCount = parseInt(verifyResult.rows[0].count);
      
      if (renderCount === data.rows.length) {
        console.log(`   ✅ Verified: ${renderCount} records in Render database`);
      } else {
        console.log(`   ⚠️  WARNING: Count mismatch! Local: ${data.rows.length}, Render: ${renderCount}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('⚙️  STEP 4: Reset sequences for auto-increment IDs\n');
    
    const sequenceTables = [
      { table: 'barangays', column: 'id' },
      { table: 'users', column: 'id' },
      { table: 'forecasts', column: 'id' },
      { table: 'hydrants', column: 'id' },
      { table: 'mandaluyong_fire_stations', column: 'id' }
    ];
    
    for (const { table, column } of sequenceTables) {
      try {
        await renderClient.query(`
          SELECT setval(pg_get_serial_sequence('${table}', '${column}'), 
                        COALESCE((SELECT MAX(${column}) FROM ${table}), 1))
        `);
        console.log(`✅ Reset sequence for ${table}.${column}`);
      } catch (error) {
        console.log(`⚠️  Could not reset sequence for ${table}: ${error.message}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('⚙️  STEP 5: Final verification\n');
    
    // Compare record counts
    console.log('Record counts comparison:\n');
    console.log('Table Name                      Local    Render   Status');
    console.log('─'.repeat(80));
    
    let allMatch = true;
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      const localCount = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const renderCount = await renderClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const local = parseInt(localCount.rows[0].count);
      const render = parseInt(renderCount.rows[0].count);
      const match = local === render;
      
      if (!match) allMatch = false;
      
      const status = match ? '✅' : '❌';
      console.log(
        `${tableName.padEnd(31)} ${local.toString().padStart(7)} ${render.toString().padStart(8)}   ${status}`
      );
    }
    
    console.log('═'.repeat(80));
    
    if (allMatch) {
      console.log('✅ SUCCESS! All data migrated successfully!\n');
      console.log(`📊 Total records migrated: ${totalRecordsMigrated.toLocaleString()}`);
      console.log('\n💡 Next steps:');
      console.log('   1. Update .env file with new Render database URL');
      console.log('   2. Update Railway environment variables');
      console.log('   3. Test backend connection: npm start');
      console.log('   4. Deploy to Railway\n');
    } else {
      console.log('⚠️  WARNING: Some tables have mismatched counts!');
      console.log('   Review the table above and investigate discrepancies.\n');
    }
    
    localClient.release();
    renderClient.release();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    BFP DATABASE MIGRATION TOOL                                 ║');
console.log('║                    Local PostgreSQL → Render PostgreSQL                        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

migrateDatabase();
