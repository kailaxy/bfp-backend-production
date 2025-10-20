require('dotenv').config();
const { Client } = require('pg');

async function removeNatureOfFireColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔧 Removing nature_of_fire column (using cause instead)...\n');
    
    await client.query(`
      ALTER TABLE historical_fires 
      DROP COLUMN IF EXISTS nature_of_fire
    `);
    
    console.log('✅ Removed nature_of_fire column\n');

    // Verify current columns
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'historical_fires'
      ORDER BY ordinal_position
    `);

    console.log('📊 Current historical_fires columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ Fixed! We use "cause" for nature of fire.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

removeNatureOfFireColumn().catch(console.error);
