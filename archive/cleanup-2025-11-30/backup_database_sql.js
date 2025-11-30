const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(__dirname, `database_backup_${timestamp}.sql`);

console.log('🔄 Creating SQL dump backup...');
console.log(`📁 Backup file: ${backupFile}`);

// Extract connection details from DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// pg_dump command
const command = `pg_dump "${dbUrl}" > "${backupFile}"`;

console.log('\n⏳ Running pg_dump...\n');

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    return;
  }
  
  if (stderr) {
    console.log('Output:', stderr);
  }
  
  console.log('\n✅ SQL dump backup completed successfully!');
  console.log(`📁 Backup saved to: ${backupFile}`);
  console.log('\nThis file contains:');
  console.log('  - Complete database schema (CREATE TABLE statements)');
  console.log('  - All data (INSERT statements)');
  console.log('  - Indexes and constraints');
  console.log('\nYou can restore this backup using:');
  console.log(`  psql "YOUR_NEW_DATABASE_URL" < ${backupFile}`);
});
