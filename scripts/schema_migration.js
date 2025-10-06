// scripts/schema_migration.js
const { Pool } = require('pg');
require('dotenv').config();

const localConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bfpmapping',
  password: process.env.DB_PASSWORD || '514db',
  port: parseInt(process.env.DB_PORT) || 5432,
};

async function createSchema(renderUrl) {
  console.log('\n🏗️  === CREATING RENDER DATABASE SCHEMA ===\n');

  const localPool = new Pool(localConfig);
  const renderPool = new Pool({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Testing connections...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Both connections successful\n');

    // Get local table structures
    const tables = [
      'users', 'barangays', 'mandaluyong_fire_stations', 
      'hydrants', 'historical_fires', 'forecasts', 
      'notifications', 'active_fires'
    ];

    console.log('📋 Creating table schemas...\n');

    for (const tableName of tables) {
      try {
        console.log(`🔧 Creating ${tableName}...`);

        // Get the CREATE TABLE statement from local database
        let createStatement = '';
        
        if (tableName === 'users') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              username VARCHAR(255) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              email VARCHAR(255),
              role VARCHAR(50) DEFAULT 'viewer',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              station_id INTEGER,
              refresh_token TEXT
            )`;
        } else if (tableName === 'barangays') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS barangays (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              area DECIMAL,
              population INTEGER,
              geometry TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              fire_risk_level VARCHAR(50)
            )`;
        } else if (tableName === 'historical_fires') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS historical_fires (
              id SERIAL PRIMARY KEY,
              lat DOUBLE PRECISION,
              lng DOUBLE PRECISION,
              barangay TEXT,
              address TEXT,
              alarm_level TEXT,
              reported_at TIMESTAMP WITH TIME ZONE,
              resolved_at TIMESTAMP WITH TIME ZONE,
              duration_minutes INTEGER,
              casualties INTEGER DEFAULT 0,
              injuries INTEGER DEFAULT 0,
              estimated_damage DECIMAL,
              cause TEXT,
              actions_taken TEXT,
              reported_by TEXT,
              verified_by TEXT,
              attachments TEXT
            )`;
        } else if (tableName === 'forecasts') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS forecasts (
              id SERIAL PRIMARY KEY,
              barangay_name VARCHAR(255) NOT NULL,
              month INTEGER NOT NULL,
              year INTEGER NOT NULL,
              predicted_cases DECIMAL NOT NULL,
              lower_bound DECIMAL,
              upper_bound DECIMAL,
              risk_level VARCHAR(50),
              risk_flag BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`;
        } else if (tableName === 'mandaluyong_fire_stations') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS mandaluyong_fire_stations (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              latitude DOUBLE PRECISION,
              longitude DOUBLE PRECISION,
              address TEXT,
              contact_number TEXT,
              personnel_count INTEGER,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`;
        } else if (tableName === 'hydrants') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS hydrants (
              id SERIAL PRIMARY KEY,
              latitude DOUBLE PRECISION,
              longitude DOUBLE PRECISION,
              address TEXT,
              status VARCHAR(50) DEFAULT 'active',
              pressure_rating VARCHAR(50),
              last_inspected DATE,
              notes TEXT,
              barangay VARCHAR(255),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`;
        } else if (tableName === 'notifications') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS notifications (
              id SERIAL PRIMARY KEY,
              message TEXT NOT NULL,
              type VARCHAR(50) DEFAULT 'info',
              user_id INTEGER,
              read_status BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`;
        } else if (tableName === 'active_fires') {
          createStatement = `
            CREATE TABLE IF NOT EXISTS active_fires (
              id SERIAL PRIMARY KEY,
              latitude DOUBLE PRECISION,
              longitude DOUBLE PRECISION,
              address TEXT,
              barangay TEXT,
              alarm_level TEXT,
              status VARCHAR(50) DEFAULT 'active',
              reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              resolved_at TIMESTAMP WITH TIME ZONE,
              nature TEXT,
              reporter_info TEXT
            )`;
        }

        await renderPool.query(createStatement);
        console.log(`   ✅ ${tableName} created successfully`);

      } catch (error) {
        console.log(`   ⚠️  ${tableName}: ${error.message.substring(0, 60)}...`);
      }
    }

    console.log('\n🎯 Schema creation completed!');
    console.log('📝 Now run the data migration script again.');

  } catch (error) {
    console.error('\n❌ Schema creation failed:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

// Main execution
if (require.main === module) {
  const renderUrl = process.argv[2];
  if (!renderUrl) {
    console.error('❌ Please provide the Render database URL');
    process.exit(1);
  }
  
  createSchema(renderUrl);
}

module.exports = { createSchema };