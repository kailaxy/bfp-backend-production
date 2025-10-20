/**
 * Direct Railway Database Migration - Node.js Version
 * Connects directly to Railway PostgreSQL and creates the forecasts_graphs table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== Direct Railway Database Migration ===\n');
  
  // Get credentials
  const host = 'turntable.proxy.rlwy.net';
  const port = '30700';
  const database = await question('Enter database name (usually "railway"): ') || 'railway';
  const user = await question('Enter database username (usually "postgres"): ') || 'postgres';
  const password = await question('Enter database password: ');
  
  console.log('\nConnecting to Railway database...');
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Database: ${database}`);
  console.log(`User: ${user}\n`);
  
  // Create PostgreSQL connection
  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });
  
  try {
    // Test connection
    console.log('Testing connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!\n');
    
    // Read SQL migration file
    const sqlFile = path.join(__dirname, 'migrations', 'create_forecasts_graphs_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log(`SQL Migration loaded (${sql.length} characters)\n`);
    
    // Execute migration
    console.log('Executing migration...');
    const result = await pool.query(sql);
    
    console.log('\n✅ Migration executed successfully!\n');
    
    // Verify table creation
    console.log('Verifying table creation...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'forecasts_graphs'
      ORDER BY ordinal_position
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ SUCCESS: Table exists with columns:');
      verifyResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check row count
      const countResult = await pool.query('SELECT COUNT(*) FROM forecasts_graphs');
      console.log(`\n📊 Current record count: ${countResult.rows[0].count}`);
      
      if (countResult.rows[0].count === '0') {
        console.log('   Table is empty - ready for forecast generation\n');
      } else {
        console.log(`   Table has ${countResult.rows[0].count} existing records\n`);
      }
      
      console.log('=== Migration Complete ===\n');
      console.log('Next steps:');
      console.log('1. Regenerate forecasts to populate graph data');
      console.log('2. Test "View Graph" in admin panel\n');
      
    } else {
      console.log('\n❌ ERROR: Table not found after migration');
      console.log('Check if there were any SQL errors above.\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\nConnection refused. Check:');
      console.log('- Host and port are correct');
      console.log('- Railway database is running');
      console.log('- Network allows outbound connections to Railway');
    } else if (error.code === '42P07') {
      console.log('\nTable already exists! Checking structure...');
      try {
        const checkResult = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'forecasts_graphs'
        `);
        console.log('\nExisting table columns:');
        checkResult.rows.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
      } catch (e) {
        console.log('Could not check existing table:', e.message);
      }
    }
    console.log('');
  } finally {
    await pool.end();
    rl.close();
  }
}

main().catch(console.error);
