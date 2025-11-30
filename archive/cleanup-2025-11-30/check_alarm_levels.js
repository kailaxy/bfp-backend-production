require('dotenv').config();
const { Client } = require('pg');

async function checkAlarmLevels() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check distinct alarm levels
    const alarmsResult = await client.query(`
      SELECT alarm_level, COUNT(*) as count
      FROM historical_fires
      WHERE alarm_level IS NOT NULL AND alarm_level != ''
      GROUP BY alarm_level
      ORDER BY count DESC
    `);

    console.log('📊 Distinct alarm levels in database:\n');
    alarmsResult.rows.forEach(row => {
      console.log(`   "${row.alarm_level}" - ${row.count} records`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkAlarmLevels().catch(console.error);
