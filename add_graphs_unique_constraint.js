require('dotenv').config();
const { Client } = require('pg');

async function addGraphsUniqueConstraint() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if constraint already exists
    const checkConstraint = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'forecasts_graphs' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'forecasts_graphs_barangay_type_date_key'
    `);

    if (checkConstraint.rows.length > 0) {
      console.log('ℹ️  Unique constraint already exists');
    } else {
      console.log('🔧 Adding unique constraint to forecasts_graphs table...');
      
      // First, remove any duplicate rows
      await client.query(`
        DELETE FROM forecasts_graphs a USING forecasts_graphs b
        WHERE a.id > b.id 
        AND a.barangay = b.barangay 
        AND a.record_type = b.record_type 
        AND a.date = b.date
      `);
      console.log('✅ Removed any duplicate rows');

      // Add unique constraint
      await client.query(`
        ALTER TABLE forecasts_graphs 
        ADD CONSTRAINT forecasts_graphs_barangay_type_date_key 
        UNIQUE (barangay, record_type, date)
      `);
      console.log('✅ Added unique constraint: (barangay, record_type, date)');
    }

    // Verify the constraint
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'forecasts_graphs'
      ORDER BY constraint_type, constraint_name
    `);

    console.log('\n📊 Forecasts_graphs table constraints:');
    constraints.rows.forEach(row => {
      console.log(`   - ${row.constraint_name} (${row.constraint_type})`);
    });

    console.log('\n✅ ALL CONSTRAINTS VERIFIED!');
    console.log('   Graph data generation should now work correctly.');
    console.log('   Forecast generation should complete fully! 🎯');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addGraphsUniqueConstraint().catch(console.error);
