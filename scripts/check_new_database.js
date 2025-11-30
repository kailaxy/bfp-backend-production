const { Pool } = require('pg');
require('dotenv').config();

async function checkPostgreSQLDatabase() {
  // Use DATABASE_URL from environment variables
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Example: DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking PostgreSQL Database...');
    console.log('🔗 Connecting to:', DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
    
    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected:', connectionTest.rows[0].current_time);
    console.log('📊 PostgreSQL version:', connectionTest.rows[0].pg_version.split(',')[0]);
    
    // Check all tables and their structure
    console.log('\n📋 Checking table structure...');
    const tables = await pool.query(`
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
        obj_description(c.oid) as table_comment
      FROM information_schema.tables t 
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    
    console.log('Available tables:');
    const tableNames = [];
    for (const table of tables.rows) {
      console.log(`  📄 ${table.table_name} (${table.column_count} columns)`);
      tableNames.push(table.table_name);
    }
    
    // Check for expected BFP tables
    const expectedTables = [
      'users', 'barangays', 'mandaluyong_fire_stations', 'hydrants',
      'historical_fires', 'notifications', 'active_fires', 'forecasts'
    ];
    
    console.log('\n🎯 Expected table verification:');
    const missingTables = [];
    for (const expectedTable of expectedTables) {
      const exists = tableNames.includes(expectedTable);
      console.log(`  ${exists ? '✅' : '❌'} ${expectedTable}`);
      if (!exists) missingTables.push(expectedTable);
    }
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('\n✅ All expected tables are present!');
    }
    
    // Check data counts for each table
    console.log('\n📊 Checking data counts...');
    for (const tableName of tableNames) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  ${tableName}: ${count.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${tableName}: ❌ ERROR - ${err.message}`);
      }
    }
    
    // Special check for forecasts table
    if (tableNames.includes('forecasts')) {
      console.log('\n📅 Checking forecasts data in detail...');
      const forecastsCount = await pool.query('SELECT COUNT(*) as count FROM forecasts');
      console.log(`Total forecasts: ${forecastsCount.rows[0].count}`);
      
      if (parseInt(forecastsCount.rows[0].count) > 0) {
        // Get available months/years
        const availableData = await pool.query(`
          SELECT DISTINCT year, month, COUNT(*) as count 
          FROM forecasts 
          GROUP BY year, month 
          ORDER BY year ASC, month ASC
        `);
        
        console.log('Available forecast periods:');
        availableData.rows.forEach(row => {
          console.log(`  ${row.year}-${row.month.toString().padStart(2, '0')}: ${row.count} forecasts`);
        });
        
        // Check specifically for October 2025
        const oct2025 = await pool.query('SELECT COUNT(*) as count FROM forecasts WHERE year = 2025 AND month = 10');
        console.log(`\n🎯 October 2025 forecasts: ${oct2025.rows[0].count}`);
        
        if (parseInt(oct2025.rows[0].count) > 0) {
          const sampleForecasts = await pool.query(`
            SELECT barangay_name, predicted_cases, risk_level 
            FROM forecasts 
            WHERE year = 2025 AND month = 10 
            LIMIT 3
          `);
          console.log('Sample October 2025 forecasts:');
          sampleForecasts.rows.forEach(f => {
            console.log(`  • ${f.barangay_name}: ${f.predicted_cases} cases (${f.risk_level})`);
          });
        } else {
          console.log('❌ No October 2025 forecasts found!');
        }
      }
    }
    
    // Check for PostGIS (spatial extension)
    console.log('\n🗺️  Checking PostGIS extension...');
    try {
      const postgis = await pool.query("SELECT PostGIS_full_version() AS version");
      if (postgis.rows.length > 0) {
        console.log('✅ PostGIS available:', postgis.rows[0].version.split('\n')[0]);
      }
    } catch (err) {
      console.log('❌ PostGIS not available:', err.message);
    }
    
    // Check spatial tables if they exist
    const spatialTables = tableNames.filter(name => 
      name.includes('spatial') || 
      name.includes('geometry') || 
      name.includes('mandaluyong')
    );
    
    if (spatialTables.length > 0) {
      console.log('\n🗺️  Checking spatial data...');
      for (const spatialTable of spatialTables) {
        try {
          const spatialCount = await pool.query(`SELECT COUNT(*) as count FROM ${spatialTable}`);
          console.log(`  ${spatialTable}: ${spatialCount.rows[0].count} spatial records`);
        } catch (err) {
          console.log(`  ${spatialTable}: ERROR - ${err.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error('Connection failed. Please check:');
    console.error('  1. Database URL is correct');
    console.error('  2. Database is accessible from your network');
    console.error('  3. Credentials are valid');
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the check
checkPostgreSQLDatabase().catch(console.error);