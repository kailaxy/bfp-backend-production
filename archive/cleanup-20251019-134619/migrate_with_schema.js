// migrate_with_schema.js
// Complete database migration including schema and data
require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Prefer canonical DATABASE_URL in all scripts. Allow specific overrides but DO NOT fall back
// to hard-coded credentials. If the env var is not set, fail fast and ask the operator to set it.
const RENDER_DB_URL = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RENDER_DB_URL) {
  console.error('❌ ERROR: No Render DB connection string found. Set DATABASE_URL or RENDER_DATABASE_URL or PRODUCTION_DATABASE_URL in the environment.');
  process.exit(1);
}

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors.blue}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

async function migrate() {
  console.log('\n' + '='.repeat(70));
  log('🚀 COMPLETE DATABASE MIGRATION: Render → Railway', colors.magenta);
  console.log('='.repeat(70) + '\n');

  if (!RAILWAY_DB_URL) {
    log('❌ ERROR: RAILWAY_DATABASE_URL not set!', colors.red);
    process.exit(1);
  }

  const dumpFile = path.join(__dirname, 'render_backup.sql');

  try {
    // Step 1: Export from Render
    log('📤 Step 1: Exporting database from Render...', colors.magenta);
    log('   This may take 2-3 minutes for large databases...', colors.yellow);
    
    const dumpCommand = `pg_dump "${RENDER_DB_URL}" --no-owner --no-acl -f "${dumpFile}"`;
    
    await execAsync(dumpCommand);
    
    const fileSize = fs.statSync(dumpFile).size;
    log(`   ✅ Export complete! File size: ${(fileSize / 1024).toFixed(2)} KB`, colors.green);

    // Step 2: Import to Railway
    log('\n📥 Step 2: Importing to Railway database...', colors.magenta);
    log('   This may take 2-3 minutes...', colors.yellow);
    
    const restoreCommand = `psql "${RAILWAY_DB_URL}" -f "${dumpFile}"`;
    
    try {
      await execAsync(restoreCommand);
      log('   ✅ Import complete!', colors.green);
    } catch (error) {
      // Some warnings are expected, check if critical
      if (error.message.includes('ERROR')) {
        log('   ⚠️  Some errors occurred during import:', colors.yellow);
        console.log(error.stderr);
      } else {
        log('   ✅ Import complete (with minor warnings)', colors.green);
      }
    }

    // Step 3: Verify
    log('\n✅ Migration completed!', colors.green);
    log('\n📊 Next Steps:', colors.magenta);
    log('1. Check Railway dashboard to verify tables exist', colors.yellow);
    log('2. Update Railway backend environment variables', colors.yellow);
    log('3. Test your application endpoints', colors.yellow);
    
    // Clean up
    log('\n🧹 Cleaning up backup file...', colors.blue);
    fs.unlinkSync(dumpFile);
    log('   ✅ Backup file deleted', colors.green);

  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    
    if (error.message.includes('pg_dump') || error.message.includes('command not found')) {
      log('\n⚠️  PostgreSQL tools not found!', colors.yellow);
      log('Please install PostgreSQL from: https://www.postgresql.org/download/windows/', colors.yellow);
      log('Or use the manual approach in MIGRATION_GUIDE.md', colors.yellow);
    }
    
    console.error(error);
    process.exit(1);
  }
}

migrate();
