const { Pool } = require('pg');

async function checkLocalDatabase() {
  console.log('🔍 Checking for local PostgreSQL databases...\n');
  console.log('═'.repeat(80));
  
  // Try common local PostgreSQL configurations
  const localConfigs = [
    {
      name: 'Local Default',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
      }
    },
    {
      name: 'Local BFP',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'bfp',
        user: 'postgres',
        password: 'postgres'
      }
    },
    {
      name: 'Local BFP (no password)',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'bfp',
        user: 'postgres',
        password: ''
      }
    },
    {
      name: 'Local bfpmapping',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'bfpmapping',
        user: 'postgres',
        password: 'postgres'
      }
    }
  ];
  
  for (const { name, config } of localConfigs) {
    console.log(`\n🔌 Trying: ${name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    
    const pool = new Pool(config);
    
    try {
      const client = await pool.connect();
      console.log('   ✅ CONNECTION SUCCESSFUL!\n');
      
      // List all databases
      const dbResult = await client.query(`
        SELECT datname FROM pg_database 
        WHERE datistemplate = false 
        ORDER BY datname
      `);
      
      console.log('   📁 Available databases:');
      dbResult.rows.forEach(row => {
        console.log(`      - ${row.datname}`);
      });
      
      // If connected, check for BFP tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      if (tables.rows.length > 0) {
        console.log('\n   📊 Tables found:');
        for (const row of tables.rows) {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`);
          console.log(`      - ${row.table_name}: ${countResult.rows[0].count} records`);
        }
      } else {
        console.log('\n   ⚠️  No tables found in this database');
      }
      
      client.release();
      await pool.end();
      
      console.log('\n' + '═'.repeat(80));
      console.log('✅ FOUND LOCAL DATABASE WITH DATA!');
      console.log(`\nConnection string for .env:`);
      console.log(`DATABASE_URL=postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
      console.log('═'.repeat(80));
      
      return; // Exit after finding first working connection
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      await pool.end();
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('❌ No local PostgreSQL database found');
  console.log('\n💡 Options:');
  console.log('   1. Check if PostgreSQL is installed: postgres --version');
  console.log('   2. Start PostgreSQL service if installed');
  console.log('   3. Check if you have a database dump/backup file (.sql, .dump)');
  console.log('   4. Look for CSV exports of historical data');
  console.log('═'.repeat(80));
}

checkLocalDatabase();
