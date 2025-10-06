// scripts/simple_migration.js
const { Pool } = require('pg');
require('dotenv').config();

// Database configurations
const localConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bfpmapping',
  password: process.env.DB_PASSWORD || '514db',
  port: parseInt(process.env.DB_PORT) || 5432,
};

async function simpleMigration(renderUrl) {
  console.log('\n🚀 === SIMPLE DATABASE MIGRATION ===\n');

  const localPool = new Pool(localConfig);
  const renderPool = new Pool({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connections
    console.log('🔌 Testing connections...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Both connections successful\n');

    // Business tables to migrate
    const tables = [
      'users', 'barangays', 'mandaluyong_fire_stations', 
      'hydrants', 'historical_fires', 'forecasts', 
      'notifications', 'active_fires'
    ];

    console.log('📋 Tables to migrate:', tables.length);
    console.log('');

    let successCount = 0;
    const results = {};

    for (const tableName of tables) {
      try {
        console.log(`🔄 Migrating ${tableName}...`);

        // Get table structure
        const structureQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `;
        const structure = await localPool.query(structureQuery, [tableName]);
        
        // Get all data
        const data = await localPool.query(`SELECT * FROM ${tableName}`);
        console.log(`   📊 Found ${data.rows.length} records`);

        if (data.rows.length === 0) {
          console.log(`   ⚠️  No data to migrate for ${tableName}`);
          results[tableName] = { success: true, records: 0, message: 'No data' };
          successCount++;
          continue;
        }

        // Create table if it doesn't exist (basic structure)
        const columns = structure.rows.map(col => {
          let def = `${col.column_name} ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default) def += ` DEFAULT ${col.column_default}`;
          return def;
        }).join(', ');

        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS ${tableName} (${columns})
        `;

        try {
          await renderPool.query(createTableQuery);
          console.log(`   ✅ Table structure ready`);
        } catch (createError) {
          console.log(`   ⚠️  Table might already exist: ${createError.message.substring(0, 50)}...`);
        }

        // Clear existing data
        await renderPool.query(`DELETE FROM ${tableName}`);

        // Insert data in batches
        if (data.rows.length > 0) {
          const columnNames = Object.keys(data.rows[0]);
          const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO ${tableName} (${columnNames.join(', ')}) 
            VALUES (${placeholders})
          `;

          let insertedCount = 0;
          for (const row of data.rows) {
            try {
              const values = columnNames.map(col => {
                let value = row[col];
                // Handle special data types
                if (value instanceof Date) {
                  return value.toISOString();
                }
                if (typeof value === 'object' && value !== null) {
                  return JSON.stringify(value);
                }
                return value;
              });

              await renderPool.query(insertQuery, values);
              insertedCount++;
            } catch (insertError) {
              console.log(`   ⚠️  Failed to insert row: ${insertError.message.substring(0, 50)}...`);
            }
          }

          console.log(`   ✅ Inserted ${insertedCount}/${data.rows.length} records`);
          results[tableName] = { 
            success: insertedCount > 0, 
            records: insertedCount, 
            total: data.rows.length 
          };
          if (insertedCount > 0) successCount++;
        }

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results[tableName] = { success: false, error: error.message };
      }
      console.log('');
    }

    // Verification
    console.log('🔍 === VERIFICATION ===\n');

    for (const tableName of tables) {
      try {
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const renderCount = await renderPool.query(`SELECT COUNT(*) FROM ${tableName}`);
        
        const localNum = parseInt(localCount.rows[0].count);
        const renderNum = parseInt(renderCount.rows[0].count);
        const status = localNum === renderNum ? '✅' : '❌';
        
        console.log(`${tableName.padEnd(25)} ${localNum.toString().padEnd(8)} → ${renderNum.toString().padEnd(8)} ${status}`);
      } catch (error) {
        console.log(`${tableName.padEnd(25)} ❌ Verification failed`);
      }
    }

    console.log('\n📊 === SUMMARY ===');
    console.log(`✅ Successfully migrated: ${successCount}/${tables.length} tables`);

    if (successCount === tables.length) {
      console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('🚀 Your Render database is ready for production!');
    } else {
      console.log('\n⚠️  Migration completed with some issues');
      console.log('Check the logs above for details');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

// Main execution
if (require.main === module) {
  const renderUrl = process.argv[2];
  if (!renderUrl) {
    console.error('❌ Please provide the Render database URL');
    process.exit(1);
  }
  
  simpleMigration(renderUrl);
}

module.exports = { simpleMigration };