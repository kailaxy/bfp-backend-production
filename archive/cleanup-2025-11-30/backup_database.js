const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'database_backup_' + new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]);

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup...');
    console.log(`📁 Backup directory: ${backupDir}`);
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get list of all tables
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const { rows: tables } = await db.query(tablesQuery);
    console.log(`\n📊 Found ${tables.length} tables to backup:\n`);
    
    for (const { tablename } of tables) {
      console.log(`  ⏳ Backing up table: ${tablename}...`);
      
      try {
        // Get table schema
        const schemaQuery = `
          SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;
        const { rows: columns } = await db.query(schemaQuery, [tablename]);
        
        // Get table data
        const dataQuery = `SELECT * FROM ${tablename}`;
        const { rows: data } = await db.query(dataQuery);
        
        // Create backup object
        const backup = {
          table: tablename,
          schema: columns,
          rowCount: data.length,
          data: data,
          backedUpAt: new Date().toISOString()
        };
        
        // Write to JSON file
        const filename = path.join(backupDir, `${tablename}.json`);
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
        
        console.log(`  ✅ ${tablename}: ${data.length} rows backed up`);
        
        // Also create a CSV for easy viewing
        if (data.length > 0) {
          const csvFilename = path.join(backupDir, `${tablename}.csv`);
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => 
            Object.values(row).map(val => {
              if (val === null) return '';
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              if (Array.isArray(val)) return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
              if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
              return val;
            }).join(',')
          ).join('\n');
          fs.writeFileSync(csvFilename, headers + '\n' + rows);
        }
        
      } catch (err) {
        console.error(`  ❌ Error backing up ${tablename}:`, err.message);
      }
    }
    
    // Create a summary file
    const summary = {
      backupDate: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Not connected',
      tables: tables.map(t => t.tablename),
      totalTables: tables.length,
      backupLocation: backupDir
    };
    
    fs.writeFileSync(
      path.join(backupDir, '_BACKUP_SUMMARY.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Database backup completed successfully!');
    console.log(`📁 Backup saved to: ${backupDir}`);
    console.log(`\nFiles created:`);
    console.log(`  - JSON files: ${tables.length} (with schema + data)`);
    console.log(`  - CSV files: ${tables.length} (for easy viewing)`);
    console.log(`  - _BACKUP_SUMMARY.json (backup metadata)`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// Run backup
backupDatabase().catch(console.error);
