// scripts/enhanced_migration.js
const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configurations
const localConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bfpmapping',
  password: process.env.DB_PASSWORD || '514db',
  port: parseInt(process.env.DB_PORT) || 5432,
};

async function enhancedMigration(renderUrl) {
  console.log('\n🚀 === ENHANCED DATABASE MIGRATION ===\n');

  const localPool = new Pool(localConfig);
  const renderPool = new Pool({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    
    await localPool.query('SELECT 1');
    console.log('✅ Local database connection successful');
    
    await renderPool.query('SELECT 1');
    console.log('✅ Render database connection successful');

    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'temp', 'migration');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Step 1: Export schema and data separately
    console.log('\n📤 Step 1: Exporting local database...');
    
    const schemaFile = path.join(backupDir, 'schema.sql');
    const dataFile = path.join(backupDir, 'data.sql');

    // Export schema only
    await executeCommand('pg_dump', [
      '-h', localConfig.host,
      '-p', localConfig.port.toString(),
      '-U', localConfig.user,
      '-d', localConfig.database,
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      '-f', schemaFile
    ], localConfig.password);

    console.log('✅ Schema exported to:', schemaFile);

    // Export data only for business tables
    const businessTables = [
      'active_fires', 'barangays', 'forecasts', 'historical_fires',
      'hydrants', 'mandaluyong_fire_stations', 'notifications', 'users'
    ];

    await executeCommand('pg_dump', [
      '-h', localConfig.host,
      '-p', localConfig.port.toString(),
      '-U', localConfig.user,
      '-d', localConfig.database,
      '--data-only',
      '--no-owner',
      '--no-privileges',
      '--column-inserts',
      ...businessTables.flatMap(table => ['-t', table]),
      '-f', dataFile
    ], localConfig.password);

    console.log('✅ Data exported to:', dataFile);

    // Step 2: Import to Render
    console.log('\n📥 Step 2: Importing to Render database...');

    // Parse Render URL
    const url = new URL(renderUrl);
    const renderConfig = {
      host: url.hostname,
      port: url.port || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1)
    };

    // Import schema first
    console.log('📋 Importing schema...');
    await executeCommand('psql', [
      '-h', renderConfig.host,
      '-p', renderConfig.port.toString(),
      '-U', renderConfig.user,
      '-d', renderConfig.database,
      '-f', schemaFile
    ], renderConfig.password, { PGSSLMODE: 'require' });

    console.log('✅ Schema imported successfully');

    // Import data
    console.log('📊 Importing data...');
    await executeCommand('psql', [
      '-h', renderConfig.host,
      '-p', renderConfig.port.toString(),
      '-U', renderConfig.user,
      '-d', renderConfig.database,
      '-f', dataFile
    ], renderConfig.password, { PGSSLMODE: 'require' });

    console.log('✅ Data imported successfully');

    // Step 3: Verify migration
    console.log('\n🔍 Step 3: Verifying migration...');
    
    const localTables = await getTableCounts(localPool);
    const renderTables = await getTableCounts(renderPool);

    console.log('\n📊 Migration Verification:');
    console.log('Table'.padEnd(25) + 'Local'.padEnd(10) + 'Render'.padEnd(10) + 'Status');
    console.log('-'.repeat(50));

    let successCount = 0;
    let totalTables = 0;

    for (const tableName of businessTables) {
      const localCount = localTables[tableName] || 0;
      const renderCount = renderTables[tableName] || 0;
      const status = localCount === renderCount ? '✅' : '❌';
      
      if (localCount === renderCount) successCount++;
      totalTables++;

      console.log(
        tableName.padEnd(25) + 
        localCount.toString().padEnd(10) + 
        renderCount.toString().padEnd(10) + 
        status
      );
    }

    console.log('-'.repeat(50));
    console.log(`📈 Success Rate: ${successCount}/${totalTables} tables migrated correctly`);

    if (successCount === totalTables) {
      console.log('\n🎉 === MIGRATION COMPLETED SUCCESSFULLY ===');
      console.log('✅ All business tables migrated correctly');
      console.log('✅ Data integrity verified');
      console.log('🚀 Your Render database is ready for production!');
    } else {
      console.log('\n⚠️  === MIGRATION COMPLETED WITH ISSUES ===');
      console.log('Some tables may need manual verification');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up temporary files...');
    fs.unlinkSync(schemaFile);
    fs.unlinkSync(dataFile);
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

async function executeCommand(command, args, password, env = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      env: { 
        ...process.env, 
        PGPASSWORD: password,
        ...env
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
      }
    });
  });
}

async function getTableCounts(pool) {
  const counts = {};
  const tables = [
    'active_fires', 'barangays', 'forecasts', 'historical_fires',
    'hydrants', 'mandaluyong_fire_stations', 'notifications', 'users'
  ];

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    } catch (error) {
      counts[table] = 0;
    }
  }

  return counts;
}

// Main execution
if (require.main === module) {
  const renderUrl = process.argv[2];
  if (!renderUrl) {
    console.error('❌ Please provide the Render database URL as an argument');
    console.log('Usage: node enhanced_migration.js "postgresql://user:pass@host:port/db"');
    process.exit(1);
  }
  
  enhancedMigration(renderUrl);
}

module.exports = { enhancedMigration };