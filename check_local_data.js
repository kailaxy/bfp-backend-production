require('dotenv').config();
const { Pool } = require('pg');

async function checkLocalDatabase() {
  console.log('🔍 Checking Local PostgreSQL Database...\n');
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
    
    // Check all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  DATABASE IS EMPTY - No tables found\n');
      console.log('📋 Next steps:');
      console.log('   1. Run railway_schema.sql to create tables');
      console.log('   2. Import historical data from CSV');
      console.log('   3. Generate ARIMA forecasts');
      client.release();
      await pool.end();
      return;
    }
    
    console.log('📊 TABLES AND DATA COUNT:\n');
    console.log('─'.repeat(80));
    
    let totalRecords = 0;
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        totalRecords += count;
        
        const status = count > 0 ? '✅' : '⚠️ ';
        console.log(`${status} ${tableName.padEnd(30)} ${count.toLocaleString()} records`);
        
        // Show sample data for key tables
        if (count > 0 && ['historical_fires', 'forecasts', 'barangays'].includes(tableName)) {
          const sample = await client.query(`SELECT * FROM ${tableName} LIMIT 3`);
          if (sample.rows.length > 0) {
            console.log(`   Sample: ${JSON.stringify(sample.rows[0]).substring(0, 100)}...`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${tableName.padEnd(30)} Error: ${error.message}`);
      }
    }
    
    console.log('─'.repeat(80));
    console.log(`📈 TOTAL RECORDS: ${totalRecords.toLocaleString()}\n`);
    
    // Check specific data
    if (tables.rows.find(r => r.table_name === 'historical_fires')) {
      const dateRange = await client.query(`
        SELECT 
          MIN(TO_CHAR(date, 'YYYY-MM')) as earliest,
          MAX(TO_CHAR(date, 'YYYY-MM')) as latest,
          COUNT(*) as total
        FROM historical_fires
      `);
      
      if (dateRange.rows[0].total > 0) {
        console.log('📅 Historical Fires Date Range:');
        console.log(`   ${dateRange.rows[0].earliest} → ${dateRange.rows[0].latest}`);
        console.log(`   Total: ${dateRange.rows[0].total} records\n`);
      }
    }
    
    if (tables.rows.find(r => r.table_name === 'forecasts')) {
      const forecastRange = await client.query(`
        SELECT 
          MIN(year || '-' || LPAD(month::text, 2, '0')) as earliest,
          MAX(year || '-' || LPAD(month::text, 2, '0')) as latest,
          COUNT(DISTINCT barangay_name) as barangays,
          COUNT(*) as total
        FROM forecasts
      `);
      
      if (forecastRange.rows[0].total > 0) {
        console.log('🔮 Forecasts Range:');
        console.log(`   ${forecastRange.rows[0].earliest} → ${forecastRange.rows[0].latest}`);
        console.log(`   Barangays: ${forecastRange.rows[0].barangays}`);
        console.log(`   Total: ${forecastRange.rows[0].total} records\n`);
      }
    }
    
    if (tables.rows.find(r => r.table_name === 'barangays')) {
      const barangayList = await client.query(`
        SELECT name FROM barangays ORDER BY name
      `);
      
      if (barangayList.rows.length > 0) {
        console.log(`🏘️  Barangays (${barangayList.rows.length}):`);
        console.log('   ' + barangayList.rows.map(r => r.name).join(', '));
        console.log('');
      }
    }
    
    console.log('═'.repeat(80));
    console.log('✅ DATABASE CHECK COMPLETE\n');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Check:');
    console.log('   - PostgreSQL service is running');
    console.log('   - Database "bfpmapping" exists');
    console.log('   - Password is correct: 514db');
    console.log('   - User "postgres" has access');
    await pool.end();
    process.exit(1);
  }
}

checkLocalDatabase();
