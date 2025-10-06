// scripts/robust_migration.js
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

async function robustMigration(renderUrl) {
  console.log('\n🚀 === ROBUST DATABASE MIGRATION ===\n');

  const localPool = new Pool(localConfig);
  
  // Try both internal and external URLs
  const urls = [
    renderUrl,
    renderUrl.replace('.singapore-postgres.render.com', '') // Try internal URL
  ];

  let renderPool = null;
  let workingUrl = null;

  console.log('🔌 Testing Render database connections...');
  
  for (const url of urls) {
    try {
      console.log(`   Testing: ${url.includes('singapore') ? 'External URL' : 'Internal URL'}`);
      
      const testPool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
        statement_timeout: 10000,
      });

      await testPool.query('SELECT 1');
      console.log(`   ✅ Connection successful!`);
      
      renderPool = testPool;
      workingUrl = url;
      break;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message.substring(0, 60)}...`);
    }
  }

  if (!renderPool) {
    console.log('\n❌ Could not connect to Render database with either URL');
    console.log('   Please check:');
    console.log('   1. Database is running on Render');
    console.log('   2. Network connectivity');
    console.log('   3. Database credentials are correct');
    return;
  }

  console.log(`\n✅ Using: ${workingUrl.includes('singapore') ? 'External URL' : 'Internal URL'}`);

  try {
    // Test local connection
    console.log('🔌 Testing local database connection...');
    await localPool.query('SELECT 1');
    console.log('✅ Local database connection successful\n');

    // Business tables to migrate
    const tables = [
      'users', 'barangays', 'mandaluyong_fire_stations', 
      'hydrants', 'historical_fires', 'forecasts', 
      'notifications', 'active_fires'
    ];

    console.log(`📋 Tables to migrate: ${tables.length}`);
    console.log('');

    let successCount = 0;
    const results = {};

    for (const tableName of tables) {
      try {
        console.log(`🔄 Migrating ${tableName}...`);

        // Get all data from local
        const data = await localPool.query(`SELECT * FROM ${tableName}`);
        console.log(`   📊 Found ${data.rows.length} records`);

        if (data.rows.length === 0) {
          console.log(`   ⚠️  No data to migrate for ${tableName}`);
          results[tableName] = { success: true, records: 0, message: 'No data' };
          successCount++;
          continue;
        }

        // Clear existing data in Render database
        try {
          await renderPool.query(`DELETE FROM ${tableName}`);
          console.log(`   🗑️  Cleared existing data`);
        } catch (clearError) {
          console.log(`   ⚠️  Could not clear table (might not exist): ${clearError.message.substring(0, 50)}...`);
        }

        // Get column names from first row
        const columnNames = Object.keys(data.rows[0]);
        
        // Insert data in smaller batches to avoid timeouts
        const batchSize = 50;
        let totalInserted = 0;

        for (let i = 0; i < data.rows.length; i += batchSize) {
          const batch = data.rows.slice(i, i + batchSize);
          
          try {
            // Use transaction for batch
            await renderPool.query('BEGIN');
            
            for (const row of batch) {
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

              const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
              const insertQuery = `
                INSERT INTO ${tableName} (${columnNames.join(', ')}) 
                VALUES (${placeholders})
                ON CONFLICT DO NOTHING
              `;

              await renderPool.query(insertQuery, values);
              totalInserted++;
            }
            
            await renderPool.query('COMMIT');
            console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
          } catch (batchError) {
            await renderPool.query('ROLLBACK');
            console.log(`   ⚠️  Batch ${Math.floor(i/batchSize) + 1} failed: ${batchError.message.substring(0, 50)}...`);
          }
        }

        console.log(`   ✅ Inserted ${totalInserted}/${data.rows.length} records`);
        results[tableName] = { 
          success: totalInserted > 0, 
          records: totalInserted, 
          total: data.rows.length 
        };
        
        if (totalInserted > 0) successCount++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message.substring(0, 60)}...`);
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
      
      // Update backend .env suggestion
      console.log('\n📝 Next Steps:');
      console.log('1. Update your backend .env file with:');
      console.log(`   DATABASE_URL="${workingUrl}"`);
      console.log('2. Test your application with the Render database');
      console.log('3. Deploy to Render when ready');
    } else {
      console.log('\n⚠️  Migration completed with some issues');
      console.log('Some tables may need manual attention');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
  } finally {
    await localPool.end();
    if (renderPool) await renderPool.end();
  }
}

// Main execution
if (require.main === module) {
  const renderUrl = process.argv[2];
  if (!renderUrl) {
    console.error('❌ Please provide the Render database URL');
    console.log('Usage: node robust_migration.js "postgresql://user:pass@host:port/db"');
    process.exit(1);
  }
  
  robustMigration(renderUrl);
}

module.exports = { robustMigration };