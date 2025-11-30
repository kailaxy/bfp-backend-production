require('dotenv').config();
const { Client } = require('pg');

async function checkCauseValues() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check distinct cause values
    const causesResult = await client.query(`
      SELECT cause, COUNT(*) as count
      FROM historical_fires
      WHERE cause IS NOT NULL AND cause != ''
      GROUP BY cause
      ORDER BY count DESC
    `);

    console.log('📊 Distinct cause values in database:\n');
    causesResult.rows.forEach(row => {
      console.log(`   "${row.cause}" - ${row.count} records`);
    });

    // Check total records
    const totalResult = await client.query('SELECT COUNT(*) FROM historical_fires');
    console.log(`\n📈 Total records: ${totalResult.rows[0].count}`);

    // Check records with null/empty cause
    const nullCauseResult = await client.query(`
      SELECT COUNT(*) FROM historical_fires WHERE cause IS NULL OR cause = ''
    `);
    console.log(`   Records with null/empty cause: ${nullCauseResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkCauseValues().catch(console.error);
