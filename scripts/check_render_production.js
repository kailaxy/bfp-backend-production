const { Pool } = require('pg');

async function checkRenderProductionData() {
  // Use the new Render external DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2";
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking Render Production Database...');
    console.log('🔗 Connecting to:', DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
    
    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected:', connectionTest.rows[0].current_time);
    console.log('📊 PostgreSQL version:', connectionTest.rows[0].pg_version.split(',')[0]);
    
    // Check all tables exist
    console.log('\n📋 Checking table structure...');
    const tables = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tables.rows.forEach(table => {
      console.log(`  📄 ${table.table_name} (${table.column_count} columns)`);
    });
    
    // Check forecasts table specifically
    console.log('\n📊 Checking forecasts data...');
    try {
      const forecastsCount = await pool.query('SELECT COUNT(*) as count FROM forecasts');
      console.log('Total forecasts:', forecastsCount.rows[0].count);
      
      if (parseInt(forecastsCount.rows[0].count) > 0) {
        // Get available months/years
        const availableData = await pool.query(`
          SELECT DISTINCT year, month, COUNT(*) as count 
          FROM forecasts 
          GROUP BY year, month 
          ORDER BY year ASC, month ASC
        `);
        
        console.log('\nAvailable forecast periods:');
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
        }
      }
    } catch (err) {
      console.log('❌ Forecasts table error:', err.message);
    }
    
    // Check other important tables
    console.log('\n📋 Checking other tables...');
    const importantTables = ['historical_fires', 'users', 'barangays', 'notifications'];
    
    for (const table of importantTables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${count.rows[0].count} records`);
      } catch (err) {
        console.log(`${table}: ❌ ERROR - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the check
checkRenderProductionData().catch(console.error);