/**
 * Check available databases on Railway PostgreSQL
 * This will help identify the correct database name
 */

const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== Railway Database Checker ===\n');
  
  const password = await question('Enter database password (or press Enter for default): ');
  const actualPassword = password || 'gtjgsixajmDAShmhwqFiqIlkLwuicgDT';
  
  // Try connecting to 'postgres' database first (default)
  const pool = new Pool({
    host: 'turntable.proxy.rlwy.net',
    port: 30700,
    database: 'postgres',
    user: 'postgres',
    password: actualPassword,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('\nConnecting to default "postgres" database...');
    const result = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname');
    
    console.log('\n✅ Available databases on Railway:');
    result.rows.forEach(row => {
      console.log(`   - ${row.datname}`);
    });
    
    console.log('\n📝 Use one of these database names when running direct_railway_migration.js');
    console.log('   (The actual database name from PGDATABASE variable)\n');
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('\n⚠️  "postgres" database not found. Trying "railway"...\n');
      
      // Try 'railway' as database name
      const railwayPool = new Pool({
        host: 'turntable.proxy.rlwy.net',
        port: 30700,
        database: 'railway',
        user: 'postgres',
        password: actualPassword,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      try {
        await railwayPool.query('SELECT NOW()');
        console.log('✅ Successfully connected to "railway" database!');
        console.log('\nUse "railway" as the database name.\n');
      } catch (e) {
        console.error('❌ Could not connect to "railway" either:', e.message);
        console.log('\nPlease check your Railway dashboard for the correct PGDATABASE value.\n');
      } finally {
        await railwayPool.end();
      }
    } else {
      console.error('\n❌ ERROR:', error.message);
    }
    console.log('');
  } finally {
    await pool.end();
    rl.close();
  }
}

main().catch(console.error);
