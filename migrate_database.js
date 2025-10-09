// migrate_database.js
// Automated database migration script from Render PostgreSQL to Railway PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Configuration
const RENDER_DB_URL = process.env.RENDER_DATABASE_URL || 
  'postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2';

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DB_URL) {
  console.error(`${colors.red}❌ ERROR: RAILWAY_DATABASE_URL not set!${colors.reset}`);
  console.log(`\n${colors.yellow}Please set RAILWAY_DATABASE_URL environment variable or create Railway PostgreSQL database first.${colors.reset}`);
  process.exit(1);
}

// Create connection pools
const renderPool = new Pool({
  connectionString: RENDER_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const railwayPool = new Pool({
  connectionString: RAILWAY_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// Tables to migrate (in order - respecting foreign key dependencies)
const TABLES_TO_MIGRATE = [
  'users',
  'fire_stations',
  'hydrants',
  'barangays',
  'active_fires',
  'incidents_history',
  'incidents_reports',
  'arima_forecasts',
  'notifications',
  'fire_station_assignments',
  'refresh_tokens'
];

// Statistics tracker
const stats = {
  tablesProcessed: 0,
  totalRowsMigrated: 0,
  errors: [],
  startTime: null,
  endTime: null
};

/**
 * Log with timestamp and color
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors.blue}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

/**
 * Get all tables from source database
 */
async function getSourceTables() {
  log('🔍 Discovering tables in Render database...', colors.magenta);
  
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await renderPool.query(query);
  const tables = result.rows.map(row => row.table_name);
  
  log(`Found ${tables.length} tables: ${tables.join(', ')}`, colors.blue);
  return tables;
}

/**
 * Get table schema (columns, types, constraints)
 */
async function getTableSchema(tableName) {
  const query = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await renderPool.query(query, [tableName]);
  return result.rows;
}

/**
 * Create table in Railway database if it doesn't exist
 */
async function ensureTableExists(tableName) {
  // Get CREATE TABLE statement from Render
  const query = `
    SELECT 
      'CREATE TABLE IF NOT EXISTS ' || quote_ident(table_name) || ' (' ||
      string_agg(
        quote_ident(column_name) || ' ' || 
        data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
          THEN '(' || character_maximum_length || ')' 
          ELSE '' 
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL 
          THEN ' DEFAULT ' || column_default 
          ELSE '' 
        END,
        ', '
      ) || 
      ');' as create_statement
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    GROUP BY table_name;
  `;
  
  try {
    const result = await renderPool.query(query, [tableName]);
    if (result.rows.length > 0) {
      const createStatement = result.rows[0].create_statement;
      await railwayPool.query(createStatement);
      log(`  ✓ Table structure ready: ${tableName}`, colors.green);
    }
  } catch (error) {
    log(`  ⚠ Could not auto-create table ${tableName}: ${error.message}`, colors.yellow);
    log(`  → Attempting to copy data anyway (table may already exist)`, colors.yellow);
  }
}

/**
 * Get row count for a table
 */
async function getRowCount(pool, tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

/**
 * Copy data from one table to another
 */
async function migrateTable(tableName) {
  log(`\n📦 Migrating table: ${tableName}`, colors.magenta);
  
  try {
    // Check if table exists and has data in source
    const sourceCount = await getRowCount(renderPool, tableName);
    
    if (sourceCount === 0) {
      log(`  ℹ Table ${tableName} is empty, skipping...`, colors.yellow);
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    log(`  → Source has ${sourceCount} rows`, colors.blue);
    
    // Ensure table exists in Railway
    await ensureTableExists(tableName);
    
    // Get all data from Render
    log(`  → Fetching data from Render...`, colors.blue);
    const sourceData = await renderPool.query(`SELECT * FROM ${tableName}`);
    
    if (sourceData.rows.length === 0) {
      log(`  ✓ No data to migrate`, colors.green);
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    // Get column names
    const columns = sourceData.fields.map(field => field.name);
    
    // Clear existing data in Railway (optional - comment out if you want to preserve existing data)
    log(`  → Clearing existing data in Railway...`, colors.blue);
    await railwayPool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    
    // Insert data in batches
    const BATCH_SIZE = 100;
    let insertedRows = 0;
    
    for (let i = 0; i < sourceData.rows.length; i += BATCH_SIZE) {
      const batch = sourceData.rows.slice(i, i + BATCH_SIZE);
      
      // Build bulk insert query
      const placeholders = batch.map((_, batchIdx) => {
        const rowPlaceholders = columns.map((_, colIdx) => 
          `$${batchIdx * columns.length + colIdx + 1}`
        ).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');
      
      const values = batch.flatMap(row => columns.map(col => row[col]));
      
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')})
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
      
      await railwayPool.query(insertQuery, values);
      insertedRows += batch.length;
      
      // Progress indicator
      const progress = Math.round((insertedRows / sourceData.rows.length) * 100);
      process.stdout.write(`\r  → Inserting data: ${insertedRows}/${sourceData.rows.length} (${progress}%)`);
    }
    
    console.log(''); // New line after progress
    
    // Verify
    const railwayCount = await getRowCount(railwayPool, tableName);
    
    if (railwayCount === sourceCount) {
      log(`  ✅ Success! Migrated ${railwayCount} rows`, colors.green);
      stats.totalRowsMigrated += railwayCount;
      return { table: tableName, rows: railwayCount, status: 'success' };
    } else {
      log(`  ⚠ Warning: Row count mismatch (Source: ${sourceCount}, Railway: ${railwayCount})`, colors.yellow);
      stats.totalRowsMigrated += railwayCount;
      return { table: tableName, rows: railwayCount, status: 'warning', sourceCount, railwayCount };
    }
    
  } catch (error) {
    log(`  ❌ Error migrating ${tableName}: ${error.message}`, colors.red);
    stats.errors.push({ table: tableName, error: error.message });
    return { table: tableName, rows: 0, status: 'error', error: error.message };
  }
}

/**
 * Sync sequences (auto-increment counters)
 */
async function syncSequences() {
  log(`\n🔄 Syncing sequences (auto-increment counters)...`, colors.magenta);
  
  const query = `
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
  `;
  
  try {
    const result = await renderPool.query(query);
    
    for (const row of result.rows) {
      const seqName = row.sequence_name;
      
      try {
        // Get current value from Render
        const renderSeq = await renderPool.query(`SELECT last_value FROM ${seqName}`);
        const lastValue = renderSeq.rows[0]?.last_value;
        
        if (lastValue) {
          // Set Railway sequence to match
          await railwayPool.query(`SELECT setval('${seqName}', ${lastValue}, true)`);
          log(`  ✓ Synced ${seqName} to ${lastValue}`, colors.green);
        }
      } catch (error) {
        log(`  ⚠ Could not sync ${seqName}: ${error.message}`, colors.yellow);
      }
    }
  } catch (error) {
    log(`  ⚠ Could not sync sequences: ${error.message}`, colors.yellow);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  stats.startTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  log('🚀 DATABASE MIGRATION: Render → Railway', colors.magenta);
  console.log('='.repeat(70) + '\n');
  
  log(`Source (Render):  ${RENDER_DB_URL.replace(/:[^:]*@/, ':****@')}`, colors.blue);
  log(`Target (Railway): ${RAILWAY_DB_URL.replace(/:[^:]*@/, ':****@')}`, colors.blue);
  
  try {
    // Test connections
    log('\n🔌 Testing database connections...', colors.magenta);
    await renderPool.query('SELECT NOW()');
    log('  ✓ Render connection OK', colors.green);
    
    await railwayPool.query('SELECT NOW()');
    log('  ✓ Railway connection OK', colors.green);
    
    // Discover tables
    const allTables = await getSourceTables();
    
    // Merge with predefined tables (some tables might not be discovered)
    const tablesToMigrate = [...new Set([...TABLES_TO_MIGRATE, ...allTables])];
    
    log(`\n📋 Will migrate ${tablesToMigrate.length} tables`, colors.blue);
    
    // Migrate each table
    const results = [];
    for (const table of tablesToMigrate) {
      const result = await migrateTable(table);
      results.push(result);
      stats.tablesProcessed++;
    }
    
    // Sync sequences
    await syncSequences();
    
    // Summary
    stats.endTime = Date.now();
    const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    log('📊 MIGRATION SUMMARY', colors.magenta);
    console.log('='.repeat(70));
    
    log(`\n⏱️  Duration: ${duration} seconds`, colors.blue);
    log(`📦 Tables processed: ${stats.tablesProcessed}`, colors.blue);
    log(`📝 Total rows migrated: ${stats.totalRowsMigrated}`, colors.blue);
    
    // Show detailed results
    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : 
                   result.status === 'empty' ? 'ℹ️' : '❌';
      console.log(`  ${icon} ${result.table.padEnd(30)} ${result.rows} rows`);
    });
    
    if (stats.errors.length > 0) {
      console.log(`\n${colors.red}❌ Errors encountered:${colors.reset}`);
      stats.errors.forEach(err => {
        console.log(`  - ${err.table}: ${err.error}`);
      });
    } else {
      log(`\n✅ Migration completed successfully with no errors!`, colors.green);
    }
    
    console.log('\n' + '='.repeat(70));
    log('🎉 Migration complete!', colors.green);
    console.log('='.repeat(70) + '\n');
    
    log('Next steps:', colors.yellow);
    log('1. Verify data in Railway dashboard', colors.yellow);
    log('2. Test your application with Railway database', colors.yellow);
    log('3. Update environment variables to use Railway DATABASE_URL', colors.yellow);
    log('4. Keep Render database as backup until October 18', colors.yellow);
    
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    await renderPool.end();
    await railwayPool.end();
  }
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
