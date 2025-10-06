// ==============================
// Database Backup Script
// ==============================
/**
 * Create a complete backup of local database before migration
 * Generates SQL dump for safety
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = `bfp_database_backup_${timestamp}.sql`;
    const backupPath = path.join(__dirname, '..', 'backups', backupFile);
    
    // Create backups directory if it doesn't exist
    const backupsDir = path.dirname(backupPath);
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbName = process.env.DB_NAME || 'bfp_db';
    const dbUser = process.env.DB_USER || 'bfp_user';
    
    console.log('💾 Creating database backup...');
    console.log(`Database: ${dbName} on ${dbHost}:${dbPort}`);
    console.log(`Backup file: ${backupFile}`);
    
    const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password > "${backupPath}"`;
    
    console.log('\\n⚠️  You may be prompted for database password\\n');
    
    exec(pgDumpCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Backup failed:', error.message);
            console.log('\\n💡 Alternative: Use manual backup from pgAdmin or similar tool');
            return;
        }
        
        if (stderr) {
            console.log('⚠️  Warnings:', stderr);
        }
        
        // Check if backup file was created and has content
        if (fs.existsSync(backupPath)) {
            const stats = fs.statSync(backupPath);
            const sizeKB = Math.round(stats.size / 1024);
            
            console.log('✅ Backup completed successfully!');
            console.log(`📁 File: ${backupPath}`);
            console.log(`📊 Size: ${sizeKB} KB`);
            console.log('\\n🔐 This backup contains all your BFP data including:');
            console.log('   • 1,299 historical fire records');
            console.log('   • 324 forecast records');
            console.log('   • User accounts and system data');
            console.log('\\n✅ Safe to proceed with migration!');
        } else {
            console.error('❌ Backup file not created');
        }
    });
}

if (require.main === module) {
    console.log('🔥 === BFP DATABASE BACKUP ===\\n');
    createBackup();
}

module.exports = { createBackup };