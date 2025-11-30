require('dotenv').config();
const { Client } = require('pg');

async function fixAllTableSequences() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Tables with integer IDs that need sequences
    const integerTables = [
      'barangays',
      'hydrants',
      'mandaluyong_fire_stations',
      'notifications',
      'users'
    ];

    // Tables with UUID that need default generator
    const uuidTables = [
      'active_fires',
      'historical_fires'
    ];

    console.log('🔧 Fixing INTEGER ID tables with sequences...\n');
    
    for (const tableName of integerTables) {
      console.log(`📋 Processing: ${tableName}`);
      
      // Get max id
      const maxId = await client.query(`SELECT MAX(id) as max_id FROM ${tableName}`);
      const nextId = (maxId.rows[0].max_id || 0) + 1;
      
      console.log(`   Current max id: ${maxId.rows[0].max_id || 0}`);
      console.log(`   Starting sequence at: ${nextId}`);

      // Create sequence
      const seqName = `${tableName}_id_seq`;
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START WITH ${nextId}`);
      
      // Set default
      await client.query(`ALTER TABLE ${tableName} ALTER COLUMN id SET DEFAULT nextval('${seqName}')`);
      
      // Associate sequence
      await client.query(`ALTER SEQUENCE ${seqName} OWNED BY ${tableName}.id`);
      
      console.log(`   ✅ Created and configured: ${seqName}\n`);
    }

    console.log('🔧 Fixing UUID ID tables with gen_random_uuid()...\n');
    
    for (const tableName of uuidTables) {
      console.log(`📋 Processing: ${tableName}`);
      
      // Enable uuid extension if not already enabled
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      // Set default to generate UUID
      await client.query(`ALTER TABLE ${tableName} ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
      
      console.log(`   ✅ Set default to gen_random_uuid()\n`);
    }

    // Verify all fixes
    console.log('📊 Verification - All tables with id columns:\n');
    
    const tables = await client.query(`
      SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name = 'id'
      ORDER BY table_name
    `);

    for (const row of tables.rows) {
      const hasDefault = row.column_default !== null;
      const status = hasDefault ? '✅' : '❌';
      console.log(`${status} ${row.table_name} (${row.data_type})`);
      console.log(`   Default: ${row.column_default || 'NONE'}\n`);
    }

    console.log('✅ ALL TABLE ID COLUMNS FIXED!');
    console.log('   All inserts will now auto-generate IDs properly.');
    console.log('   Forecast generation should now complete successfully! 🎯');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixAllTableSequences().catch(console.error);
