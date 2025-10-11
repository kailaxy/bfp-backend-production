/**
 * Direct Railway Database Migration - Simplified Version
 * Connects directly to Railway PostgreSQL and creates the forecasts_graphs table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n=== Direct Railway Database Migration ===\n');
  
  // Railway credentials
  const config = {
    host: 'turntable.proxy.rlwy.net',
    port: 30700,
    database: 'railway',
    user: 'postgres',
    password: 'gtjgsixajmDAShmhwqFiqIlkLwuicgDT',
    ssl: {
      rejectUnauthorized: false
    }
  };
  
  console.log('Connecting to Railway database...');
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}\n`);
  
  const pool = new Pool(config);
  
  try {
    // Test connection
    console.log('Testing connection...');
    await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connected successfully!\n');
    
    // Read SQL migration file
    const sqlFile = path.join(__dirname, 'migrations', 'create_forecasts_graphs_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log(`SQL Migration loaded (${sql.length} characters)\n`);
    
    // Execute migration
    console.log('Executing CREATE TABLE statement...');
    const result = await pool.query(sql);
    
    console.log('✅ Migration SQL executed!\n');
    
    // Verify table creation
    console.log('Verifying table creation...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'forecasts_graphs'
      ORDER BY ordinal_position
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ SUCCESS: forecasts_graphs table exists with columns:');
      verifyResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`   - ${col.column_name}: ${col.data_type} (${nullable})`);
      });
      
      // Check indexes
      const indexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'forecasts_graphs'
        ORDER BY indexname
      `);
      
      console.log(`\n📊 Indexes created: ${indexResult.rows.length}`);
      indexResult.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
      
      // Check row count
      const countResult = await pool.query('SELECT COUNT(*) FROM forecasts_graphs');
      console.log(`\n📊 Current record count: ${countResult.rows[0].count}`);
      
      if (countResult.rows[0].count === '0') {
        console.log('   Table is empty - ready for forecast generation\n');
      } else {
        console.log(`   Table has ${countResult.rows[0].count} existing records\n`);
      }
      
      console.log('=== Migration Complete! ===\n');
      console.log('✅ Table successfully created in Railway database');
      console.log('\nNext steps:');
      console.log('1. Regenerate forecasts to populate graph data');
      console.log('   Run: .\\regenerate_forecasts.ps1');
      console.log('2. Test "View Graph" in admin panel');
      console.log('3. Verify data visualization\n');
      
    } else {
      console.log('\n❌ ERROR: Table not found after migration');
      console.log('The SQL executed but table does not exist.\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\nConnection refused. Check:');
      console.log('- Host and port are correct');
      console.log('- Railway database is running');
      console.log('- Network allows outbound connections');
    } else if (error.code === '42P07') {
      console.log('\n⚠️  Table already exists! Verifying structure...');
      try {
        const checkResult = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'forecasts_graphs'
          ORDER BY ordinal_position
        `);
        
        if (checkResult.rows.length > 0) {
          console.log('\n✅ Existing table structure:');
          checkResult.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`   - ${col.column_name}: ${col.data_type} (${nullable})`);
          });
          
          const countResult = await pool.query('SELECT COUNT(*) FROM forecasts_graphs');
          console.log(`\n📊 Record count: ${countResult.rows[0].count}`);
          console.log('\nTable already exists and is ready to use!\n');
        }
      } catch (e) {
        console.log('Could not check existing table:', e.message);
      }
    } else if (error.code === 'ENOTFOUND') {
      console.log('\nCould not resolve hostname. Check network connection.');
    } else {
      console.log(`\nError code: ${error.code}`);
      console.log('Stack trace:', error.stack);
    }
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
