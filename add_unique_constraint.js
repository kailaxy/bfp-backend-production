require('dotenv').config();
const { Client } = require('pg');

async function addUniqueConstraint() {
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
      WHERE table_name = 'forecasts' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'forecasts_barangay_year_month_key'
    `);

    if (checkConstraint.rows.length > 0) {
      console.log('ℹ️  Unique constraint already exists');
    } else {
      console.log('🔧 Adding unique constraint to forecasts table...');
      
      // First, remove any duplicate rows
      await client.query(`
        DELETE FROM forecasts a USING forecasts b
        WHERE a.id > b.id 
        AND a.barangay_name = b.barangay_name 
        AND a.year = b.year 
        AND a.month = b.month
      `);
      console.log('✅ Removed any duplicate rows');

      // Add unique constraint
      await client.query(`
        ALTER TABLE forecasts 
        ADD CONSTRAINT forecasts_barangay_year_month_key 
        UNIQUE (barangay_name, year, month)
      `);
      console.log('✅ Added unique constraint: (barangay_name, year, month)');
    }

    // Verify the constraint
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'forecasts'
      ORDER BY constraint_type, constraint_name
    `);

    console.log('\n📊 Forecasts table constraints:');
    constraints.rows.forEach(row => {
      console.log(`   - ${row.constraint_name} (${row.constraint_type})`);
    });

    console.log('\n✅ ALL CONSTRAINTS VERIFIED!');
    console.log('   Forecast generation should now work correctly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addUniqueConstraint().catch(console.error);
