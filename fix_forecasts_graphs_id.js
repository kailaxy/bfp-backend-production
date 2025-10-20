require('dotenv').config();
const { Client } = require('pg');

async function fixForecastsGraphsId() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check current table structure
    console.log('🔍 Checking forecasts_graphs table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'forecasts_graphs'
      AND column_name = 'id'
    `);

    console.log('Current id column:', columns.rows[0]);

    // Check if sequence exists
    const sequences = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_name LIKE '%forecasts_graphs%id%'
    `);

    console.log('\n📋 Existing sequences:', sequences.rows);

    // Create sequence if it doesn't exist
    if (sequences.rows.length === 0) {
      console.log('\n🔧 Creating sequence for forecasts_graphs.id...');
      
      // Get the maximum current id
      const maxId = await client.query('SELECT MAX(id) as max_id FROM forecasts_graphs');
      const nextId = (maxId.rows[0].max_id || 0) + 1;
      
      console.log(`   Current max id: ${maxId.rows[0].max_id || 0}`);
      console.log(`   Starting sequence at: ${nextId}`);

      // Create sequence
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS forecasts_graphs_id_seq 
        START WITH ${nextId}
      `);
      console.log('✅ Created sequence: forecasts_graphs_id_seq');

      // Set the sequence as default for id column
      await client.query(`
        ALTER TABLE forecasts_graphs 
        ALTER COLUMN id SET DEFAULT nextval('forecasts_graphs_id_seq')
      `);
      console.log('✅ Set id column default to use sequence');

      // Associate the sequence with the column
      await client.query(`
        ALTER SEQUENCE forecasts_graphs_id_seq OWNED BY forecasts_graphs.id
      `);
      console.log('✅ Associated sequence with id column');

    } else {
      console.log('\n✅ Sequence already exists');
    }

    // Verify the fix
    const verifyColumns = await client.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'forecasts_graphs'
      AND column_name = 'id'
    `);

    console.log('\n📊 Verified id column configuration:');
    console.log('   Column:', verifyColumns.rows[0].column_name);
    console.log('   Default:', verifyColumns.rows[0].column_default);

    console.log('\n✅ ALL FIXES APPLIED!');
    console.log('   The forecasts_graphs.id column will now auto-increment properly.');
    console.log('   Forecast generation should now complete successfully! 🎯');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixForecastsGraphsId().catch(console.error);
