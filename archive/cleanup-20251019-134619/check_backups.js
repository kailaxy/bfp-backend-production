require('dotenv').config();
const { Pool } = require('pg');

async function checkBackups() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'historical_fires_backup_%' 
      ORDER BY table_name DESC
    `);
    
    console.log('📦 Backup tables found:');
    if (result.rows.length === 0) {
      console.log('   ❌ No backups found!');
      console.log('\n⚠️  The original data with address, alarm, casualties, etc. has been lost!');
      console.log('   You need to restore from your own backup or re-import the original data.\n');
    } else {
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
      
      // Show count in latest backup
      const latestBackup = result.rows[0].table_name;
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${latestBackup}`);
      console.log(`\n   Latest backup (${latestBackup}): ${countResult.rows[0].count} records\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBackups();
