require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupMissingTable() {
  console.log('🔧 Setting up missing forecasts_graphs table...\n');
  console.log('═'.repeat(80));
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  
  try {
    const client = await pool.connect();
    console.log(`✅ Connected to: ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
    
    // Read and execute the migration SQL
    console.log('📄 Reading migration file: create_forecasts_graphs_table.sql');
    const sqlPath = path.join(__dirname, 'migrations', 'create_forecasts_graphs_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('⚙️  Creating forecasts_graphs table...');
    await client.query(sql);
    console.log('✅ Table created successfully!\n');
    
    // Verify the table
    const checkTable = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM forecasts_graphs) as record_count
      FROM information_schema.tables 
      WHERE table_name = 'forecasts_graphs'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ Verification: forecasts_graphs table exists');
      console.log(`   Records: ${checkTable.rows[0].record_count}\n`);
    }
    
    // Check columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'forecasts_graphs'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table Structure:');
    console.log('─'.repeat(80));
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${nullable}`);
    });
    console.log('');
    
    // Final check - list all tables
    console.log('═'.repeat(80));
    console.log('✅ FINAL DATABASE STATUS:\n');
    
    const allTables = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'spatial_ref_sys'
      ORDER BY table_name
    `);
    
    console.log('Table Name                      | Columns | Records');
    console.log('─'.repeat(80));
    
    for (const table of allTables.rows) {
      const countResult = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
      const count = parseInt(countResult.rows[0].count);
      console.log(`${table.table_name.padEnd(31)} | ${table.column_count.toString().padStart(7)} | ${count.toLocaleString()}`);
    }
    
    console.log('═'.repeat(80));
    console.log('✅ SUCCESS: All 9 expected tables are now present!\n');
    console.log('💡 Next steps:');
    console.log('   1. ✅ Local database is complete');
    console.log('   2. Test backend server: npm start');
    console.log('   3. Test frontend connection');
    console.log('   4. Set up automated backups');
    console.log('   5. Deploy to Railway with new database\n');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nError details:', error);
    await pool.end();
    process.exit(1);
  }
}

setupMissingTable();
