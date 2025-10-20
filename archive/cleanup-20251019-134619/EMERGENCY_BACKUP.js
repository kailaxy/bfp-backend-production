const db = require('./config/db');
const fs = require('fs');
const path = require('path');

// URGENT: Export all data before Render database expires
async function emergencyBackup() {

  try {
    console.log('🚨 EMERGENCY BACKUP STARTED - ATTEMPTING TO CONNECT TO SUSPENDED DATABASE');
    console.log('═'.repeat(80));
    
    const backupDir = path.join(__dirname, 'emergency_backup_' + Date.now());
    fs.mkdirSync(backupDir, { recursive: true });
    
    const tables = [
      'users',
      'barangays', 
      'historical_fires',
      'forecasts',
      'forecasts_graphs',
      'active_fires',
      'fire_stations',
      'hydrants'
    ];

    for (const table of tables) {
      console.log(`\n📦 Backing up table: ${table}...`);
      
      try {
        const result = await db.query(`SELECT * FROM ${table}`);
        const data = {
          table: table,
          row_count: result.rows.length,
          exported_at: new Date().toISOString(),
          data: result.rows
        };
        
        const filename = path.join(backupDir, `${table}.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`   ✅ Exported ${result.rows.length} rows to ${filename}`);
        
        // Also create CSV for important tables
        if (['historical_fires', 'forecasts'].includes(table) && result.rows.length > 0) {
          const csvFilename = path.join(backupDir, `${table}.csv`);
          const headers = Object.keys(result.rows[0]).join(',');
          const rows = result.rows.map(row => 
            Object.values(row).map(val => 
              typeof val === 'string' && val.includes(',') ? `"${val}"` : val
            ).join(',')
          );
          fs.writeFileSync(csvFilename, headers + '\n' + rows.join('\n'));
          console.log(`   ✅ Also saved as CSV: ${csvFilename}`);
        }
        
      } catch (err) {
        console.error(`   ❌ Error backing up ${table}:`, err.message);
      }
    }
    
    // Export schema
    console.log(`\n📋 Exporting database schema...`);
    const schemaResult = await db.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    const schemaFile = path.join(backupDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(schemaResult.rows, null, 2));
    console.log(`   ✅ Schema exported to ${schemaFile}`);
    
    // Create summary
    const summary = {
      backup_date: new Date().toISOString(),
      database_url: process.env.DATABASE_URL?.substring(0, 50) + '...',
      tables_backed_up: tables.length,
      backup_location: backupDir
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'BACKUP_SUMMARY.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ EMERGENCY BACKUP COMPLETE!');
    console.log(`📁 Location: ${backupDir}`);
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('❌ BACKUP FAILED:', error);
    console.error('⚠️  If database is suspended, you may need to:');
    console.error('   1. Contact Render support to temporarily restore access');
    console.error('   2. Upgrade to paid plan to restore database');
    console.error('   3. Check if you have any pg_dump backups from Render dashboard');
    throw error;
  }
}

emergencyBackup().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
