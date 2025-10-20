require('dotenv').config();
const { Client } = require('pg');

async function checkAllTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all tables with id columns
    const tables = await client.query(`
      SELECT table_name, column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name = 'id'
      ORDER BY table_name
    `);

    console.log('📊 All tables with id columns:\n');
    
    const tablesNeedingFix = [];
    
    for (const row of tables.rows) {
      const hasDefault = row.column_default && row.column_default.includes('nextval');
      const status = hasDefault ? '✅' : '⚠️';
      
      console.log(`${status} ${row.table_name}`);
      console.log(`   Type: ${row.data_type}`);
      console.log(`   Default: ${row.column_default || 'NONE'}`);
      console.log(`   Nullable: ${row.is_nullable}`);
      console.log('');
      
      if (!hasDefault && row.is_nullable === 'NO') {
        tablesNeedingFix.push(row.table_name);
      }
    }

    if (tablesNeedingFix.length > 0) {
      console.log('\n⚠️  Tables that need auto-increment sequences:');
      tablesNeedingFix.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('\n✅ All tables with id columns have proper auto-increment configured!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkAllTables().catch(console.error);
