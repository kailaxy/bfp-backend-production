// scripts/table_purposes.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bfpmapping',
  password: process.env.DB_PASSWORD || '514db',
  port: parseInt(process.env.DB_PORT) || 5432,
});

async function analyzeTablePurposes() {
  try {
    console.log('\n🔍 === BFP FIRE PREDICTION SYSTEM - DATABASE TABLES ===\n');
    
    // Define table purposes and importance
    const tableInfo = {
      'historical_fires': {
        purpose: 'Core fire incident records (2010-2024)',
        importance: 'CRITICAL - Contains all historical fire data used for ARIMA forecasting',
        keyColumns: ['lat', 'lng', 'barangay', 'reported_at', 'alarm_level', 'casualties']
      },
      'forecasts': {
        purpose: 'ARIMA-generated fire risk predictions',
        importance: 'CRITICAL - Monthly fire risk forecasts for all 27 barangays',
        keyColumns: ['barangay_name', 'month', 'year', 'predicted_cases', 'risk_level']
      },
      'barangays': {
        purpose: 'Geographic boundaries and barangay information',
        importance: 'CRITICAL - Defines the 27 areas for fire prediction',
        keyColumns: ['name', 'geometry', 'area', 'population']
      },
      'users': {
        purpose: 'System authentication and user management',
        importance: 'CRITICAL - Admin, responder, and viewer access control',
        keyColumns: ['username', 'role', 'station_id', 'refresh_token']
      },
      'mandaluyong_fire_stations': {
        purpose: 'Fire station locations and details',
        importance: 'IMPORTANT - Response coordination and resource mapping',
        keyColumns: ['name', 'latitude', 'longitude', 'contact_number']
      },
      'hydrants': {
        purpose: 'Fire hydrant locations across Mandaluyong',
        importance: 'IMPORTANT - Emergency response infrastructure mapping',
        keyColumns: ['latitude', 'longitude', 'status', 'last_inspected']
      },
      'notifications': {
        purpose: 'System alerts and messaging',
        importance: 'SUPPORTING - User notifications and system alerts',
        keyColumns: ['message', 'type', 'user_id', 'created_at']
      },
      'active_fires': {
        purpose: 'Current/ongoing fire incidents',
        importance: 'SUPPORTING - Real-time fire tracking',
        keyColumns: ['location', 'status', 'reported_at', 'severity']
      }
    };

    // System tables (PostGIS and spatial reference)
    const systemTables = {
      'spatial_ref_sys': 'PostGIS spatial reference systems (8,500 coordinate systems)',
      'geometry_columns': 'PostGIS geometry column registry',
      'geography_columns': 'PostGIS geography column registry'
    };

    console.log('📊 === BUSINESS CRITICAL TABLES ===\n');

    for (const [tableName, info] of Object.entries(tableInfo)) {
      try {
        // Get record count
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const recordCount = parseInt(countResult.rows[0].count);

        // Get column info
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName]);

        console.log(`🔥 ${tableName.toUpperCase()}`);
        console.log(`   Purpose: ${info.purpose}`);
        console.log(`   Importance: ${info.importance}`);
        console.log(`   Records: ${recordCount.toLocaleString()}`);
        console.log(`   Columns: ${columnsResult.rows.length}`);
        
        console.log('   Key Fields:');
        info.keyColumns.forEach(col => {
          const colInfo = columnsResult.rows.find(c => c.column_name === col);
          if (colInfo) {
            console.log(`     • ${col} (${colInfo.data_type})`);
          }
        });

        // Sample recent data for some tables
        if (tableName === 'historical_fires') {
          const sample = await pool.query(`
            SELECT barangay, reported_at, alarm_level 
            FROM historical_fires 
            ORDER BY reported_at DESC 
            LIMIT 3
          `);
          console.log('   Recent fires:');
          sample.rows.forEach(row => {
            console.log(`     • ${row.barangay} - ${row.reported_at?.toISOString().split('T')[0]} (Level ${row.alarm_level})`);
          });
        }

        if (tableName === 'forecasts') {
          const sample = await pool.query(`
            SELECT barangay_name, month, year, predicted_cases, risk_level 
            FROM forecasts 
            ORDER BY year DESC, month DESC 
            LIMIT 3
          `);
          console.log('   Recent forecasts:');
          sample.rows.forEach(row => {
            console.log(`     • ${row.barangay_name} - ${row.month}/${row.year}: ${row.predicted_cases} cases (${row.risk_level})`);
          });
        }

        console.log('');
      } catch (error) {
        console.log(`❌ Error analyzing ${tableName}: ${error.message}\n`);
      }
    }

    console.log('🛠️  === SYSTEM TABLES ===\n');
    for (const [tableName, description] of Object.entries(systemTables)) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const recordCount = parseInt(countResult.rows[0].count);
        console.log(`📐 ${tableName.toUpperCase()}: ${recordCount.toLocaleString()} records`);
        console.log(`   ${description}\n`);
      } catch (error) {
        console.log(`❌ Error with ${tableName}: ${error.message}\n`);
      }
    }

    console.log('📋 === MIGRATION SUMMARY ===');
    console.log('✅ Business Critical Tables: 8 (must migrate)');
    console.log('🛠️  System Tables: 3 (PostGIS - migrate for spatial functions)');
    console.log('📊 Total Records: ~10,334 across all tables');
    console.log('🎯 Primary Data: Historical fires (1,299) + Forecasts (324) + Barangays (27)');

    await pool.end();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    await pool.end();
  }
}

if (require.main === module) {
  analyzeTablePurposes();
}

module.exports = { analyzeTablePurposes };