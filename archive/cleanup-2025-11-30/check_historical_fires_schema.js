require('dotenv').config();
const { Client } = require('pg');

async function checkHistoricalFiresSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get current table structure
    const columns = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'historical_fires'
      ORDER BY ordinal_position
    `);

    console.log('📊 Current historical_fires table structure:\n');
    columns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
    });

    // Count current records
    const count = await client.query('SELECT COUNT(*) FROM historical_fires');
    console.log(`\n📈 Current record count: ${count.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkHistoricalFiresSchema().catch(console.error);
