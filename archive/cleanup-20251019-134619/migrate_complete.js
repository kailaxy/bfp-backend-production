// migrate_complete.js
// Complete migration: Schema + Data from Render to Railway
require('dotenv').config();
const { Pool } = require('pg');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

const RENDER_DB_URL = process.env.RENDER_DATABASE_URL || 
  'postgresql://bfpmapping_nua2_user:mDB9Q1s6mnnTyX6gzqSMD5CTphUsvR6L@dpg-d35r1s2li9vc738l9f70-a.oregon-postgres.render.com:5432/bfpmapping_nua2';

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DB_URL) {
  console.error(`${colors.red}❌ ERROR: RAILWAY_DATABASE_URL not set!${colors.reset}`);
  process.exit(1);
}

const renderPool = new Pool({
  connectionString: RENDER_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const railwayPool = new Pool({
  connectionString: RAILWAY_DB_URL,
  ssl: { rejectUnauthorized: false }
});

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors.blue}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

async function getTableDefinitions() {
  log('📋 Extracting table schemas from Render...', colors.magenta);
  
  const tablesQuery = `
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  
  const tables = await renderPool.query(tablesQuery);
  const definitions = [];
  
  for (const { tablename } of tables.rows) {
    log(`   → Extracting: ${tablename}`, colors.blue);
    
    // Get CREATE TABLE statement using pg_dump -t approach via SQL
    const ddlQuery = `
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || quote_ident(c.table_name) || ' (' ||
        string_agg(
          quote_ident(c.column_name) || ' ' ||
          c.udt_name ||
          CASE 
            WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length || ')'
            WHEN c.numeric_precision IS NOT NULL THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
            ELSE ''
          END ||
          CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE 
            WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default
            ELSE ''
          END,
          ', '
        ) || ');' as ddl
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = $1
      GROUP BY c.table_name;
    `;
    
    try {
      const result = await renderPool.query(ddlQuery, [tablename]);
      if (result.rows[0]) {
        definitions.push({
          table: tablename,
          ddl: result.rows[0].ddl
        });
      }
    } catch (error) {
      log(`   ⚠️ Could not extract ${tablename}: ${error.message}`, colors.yellow);
    }
  }
  
  return definitions;
}

async function createTables(definitions) {
  log('\n🔨 Creating tables in Railway...', colors.magenta);
  
  for (const { table, ddl } of definitions) {
    try {
      await railwayPool.query(ddl);
      log(`   ✅ Created: ${table}`, colors.green);
    } catch (error) {
      // Table might already exist
      if (error.message.includes('already exists')) {
        log(`   ℹ️  Already exists: ${table}`, colors.blue);
      } else {
        log(`   ⚠️ Error creating ${table}: ${error.message}`, colors.yellow);
      }
    }
  }
}

async function copyTableData(tableName) {
  try {
    // Check row count
    const countResult = await renderPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const rowCount = parseInt(countResult.rows[0].count);
    
    if (rowCount === 0) {
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    log(`   → ${tableName}: ${rowCount} rows`, colors.blue);
    
    // Get all data
    const dataResult = await renderPool.query(`SELECT * FROM ${tableName}`);
    
    if (dataResult.rows.length === 0) {
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    const columns = dataResult.fields.map(f => f.name);
    
    // Clear existing data
    await railwayPool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    
    // Insert in batches
    const BATCH_SIZE = 50;
    let inserted = 0;
    
    for (let i = 0; i < dataResult.rows.length; i += BATCH_SIZE) {
      const batch = dataResult.rows.slice(i, i + BATCH_SIZE);
      
      const placeholders = batch.map((_, bIdx) => {
        const rowPlaceholders = columns.map((_, cIdx) => 
          `$${bIdx * columns.length + cIdx + 1}`
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
      inserted += batch.length;
    }
    
    return { table: tableName, rows: inserted, status: 'success' };
    
  } catch (error) {
    log(`   ❌ Error copying ${tableName}: ${error.message}`, colors.red);
    return { table: tableName, rows: 0, status: 'error', error: error.message };
  }
}

async function migrate() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  log('🚀 COMPLETE DATABASE MIGRATION: Render → Railway', colors.magenta);
  console.log('='.repeat(70) + '\n');
  
  try {
    // Test connections
    log('🔌 Testing connections...', colors.magenta);
    await renderPool.query('SELECT NOW()');
    log('   ✅ Render OK', colors.green);
    await railwayPool.query('SELECT NOW()');
    log('   ✅ Railway OK', colors.green);
    
    // Step 1: Extract and create schemas
    const definitions = await getTableDefinitions();
    await createTables(definitions);
    
    // Step 2: Copy data
    log('\n📦 Copying data...', colors.magenta);
    
    const tables = definitions.map(d => d.table);
    let totalRows = 0;
    
    for (const table of tables) {
      const result = await copyTableData(table);
      totalRows += result.rows;
    }
    
    // Step 3: Sync sequences
    log('\n🔄 Syncing sequences...', colors.magenta);
    const seqQuery = `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`;
    const sequences = await renderPool.query(seqQuery);
    
    for (const { sequence_name } of sequences.rows) {
      try {
        const renderSeq = await renderPool.query(`SELECT last_value FROM ${sequence_name}`);
        const lastValue = renderSeq.rows[0]?.last_value;
        if (lastValue) {
          await railwayPool.query(`SELECT setval('${sequence_name}', ${lastValue}, true)`);
          log(`   ✅ ${sequence_name}: ${lastValue}`, colors.green);
        }
      } catch (error) {
        // Sequence might not exist in Railway yet
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    log('✅ MIGRATION COMPLETE!', colors.green);
    console.log('='.repeat(70));
    log(`⏱️  Duration: ${duration}s`, colors.blue);
    log(`📝 Total rows migrated: ${totalRows}`, colors.blue);
    log(`📦 Tables migrated: ${tables.length}`, colors.blue);
    
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await renderPool.end();
    await railwayPool.end();
  }
}

migrate();
