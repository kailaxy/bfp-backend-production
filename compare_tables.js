require('dotenv').config();
const { Pool } = require('pg');

async function compareTables() {
  console.log('🔍 Comparing Local Database vs Render Database Schema...\n');
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
    
    // Expected tables from Render
    const expectedTables = [
      'active_fires',
      'barangays',
      'forecasts',
      'forecasts_graphs',
      'historical_fires',
      'hydrants',
      'mandaluyong_fire_stations',
      'notifications',
      'users'
    ];
    
    // Check existing tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'spatial_ref_sys'
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(r => r.table_name);
    
    console.log('📊 TABLE COMPARISON:\n');
    console.log('─'.repeat(80));
    console.log('Status | Table Name                    | Records      | Notes');
    console.log('─'.repeat(80));
    
    let allTablesPresent = true;
    let totalRecords = 0;
    
    for (const tableName of expectedTables) {
      const exists = existingTables.includes(tableName);
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        totalRecords += count;
        
        let notes = '';
        if (count === 0) {
          notes = '⚠️  Empty';
        } else if (tableName === 'forecasts' && count < 324) {
          notes = `⚠️  Expected ~324 (27 barangays × 12 months)`;
        } else if (tableName === 'historical_fires' && count < 1296) {
          notes = `✅ Good (1,296+ expected)`;
        } else {
          notes = '✅ Has data';
        }
        
        console.log(`  ✅   | ${tableName.padEnd(29)} | ${count.toString().padStart(12)} | ${notes}`);
      } else {
        console.log(`  ❌   | ${tableName.padEnd(29)} | ${'-'.padStart(12)} | MISSING`);
        allTablesPresent = false;
      }
    }
    
    console.log('─'.repeat(80));
    console.log(`Total Records (excluding spatial_ref_sys): ${totalRecords.toLocaleString()}\n`);
    
    // Check for missing table
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    const extraTables = existingTables.filter(t => !expectedTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('❌ MISSING TABLES:');
      missingTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    if (extraTables.length > 0) {
      console.log('ℹ️  EXTRA TABLES (not in Render schema):');
      extraTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    // Detailed checks
    console.log('═'.repeat(80));
    console.log('📋 DETAILED DATA CHECK:\n');
    
    // Barangays
    if (existingTables.includes('barangays')) {
      const barangays = await client.query('SELECT name FROM barangays ORDER BY name');
      console.log(`✅ Barangays: ${barangays.rows.length} (Expected: 27)`);
      if (barangays.rows.length === 27) {
        console.log('   All 27 Mandaluyong City barangays present!\n');
      } else {
        console.log('   ⚠️  Not all barangays present\n');
      }
    }
    
    // Historical fires
    if (existingTables.includes('historical_fires')) {
      const histQuery = await client.query(`
        SELECT 
          COUNT(*) as total,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM historical_fires
      `);
      console.log(`✅ Historical Fires: ${histQuery.rows[0].total} records`);
      if (histQuery.rows[0].earliest) {
        console.log(`   Date range: ${histQuery.rows[0].earliest} → ${histQuery.rows[0].latest}\n`);
      }
    }
    
    // Forecasts
    if (existingTables.includes('forecasts')) {
      const forecastQuery = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT barangay_name) as barangays,
          MIN(year || '-' || LPAD(month::text, 2, '0')) as earliest,
          MAX(year || '-' || LPAD(month::text, 2, '0')) as latest
        FROM forecasts
      `);
      console.log(`✅ Forecasts: ${forecastQuery.rows[0].total} records`);
      console.log(`   Barangays covered: ${forecastQuery.rows[0].barangays}`);
      console.log(`   Time range: ${forecastQuery.rows[0].earliest} → ${forecastQuery.rows[0].latest}\n`);
    }
    
    // Users
    if (existingTables.includes('users')) {
      const users = await client.query('SELECT username, role FROM users ORDER BY username');
      console.log(`✅ Users: ${users.rows.length} accounts`);
      users.rows.forEach(u => {
        console.log(`   - ${u.username} (${u.role})`);
      });
      console.log('');
    }
    
    console.log('═'.repeat(80));
    
    if (allTablesPresent && missingTables.length === 0) {
      console.log('✅ SUCCESS: All expected tables are present!');
      console.log('✅ Your local database is COMPLETE and matches Render schema!\n');
    } else {
      console.log('⚠️  INCOMPLETE: Some tables are missing');
      console.log('   You may need to create missing tables from railway_schema.sql\n');
    }
    
    console.log('💡 Next steps:');
    if (missingTables.includes('forecasts_graphs')) {
      console.log('   1. Create forecasts_graphs table (optional, for graph data)');
    }
    console.log('   2. Update Railway environment variables to use this database');
    console.log('   3. Test backend connection');
    console.log('   4. Set up automated backups');
    console.log('═'.repeat(80));
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

compareTables();
