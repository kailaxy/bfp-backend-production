// scripts/fix_remaining_tables.js
const { Pool } = require('pg');
require('dotenv').config();

const localConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bfpmapping',
  password: process.env.DB_PASSWORD || '514db',
  port: parseInt(process.env.DB_PORT) || 5432,
};

async function fixRemainingTables(renderUrl) {
  console.log('\n🔧 === FIXING REMAINING TABLES ===\n');

  const localPool = new Pool(localConfig);
  const renderPool = new Pool({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Testing connections...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Both connections successful\n');

    // 1. Fix historical_fires table - check actual structure
    console.log('🔍 Analyzing historical_fires structure...');
    
    // Get local structure
    const localStruct = await localPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'historical_fires' 
      ORDER BY ordinal_position
    `);
    
    console.log('Local historical_fires columns:');
    localStruct.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Drop and recreate historical_fires with exact local structure
    console.log('\n🗑️  Dropping and recreating historical_fires...');
    await renderPool.query('DROP TABLE IF EXISTS historical_fires CASCADE');
    
    // Create with local data sample to get exact structure
    const sampleFire = await localPool.query('SELECT * FROM historical_fires LIMIT 1');
    if (sampleFire.rows.length > 0) {
      const columns = Object.keys(sampleFire.rows[0]);
      console.log('   Columns found:', columns.join(', '));
      
      // Create table dynamically based on actual data
      const createCols = columns.map(col => {
        const value = sampleFire.rows[0][col];
        let type = 'TEXT';
        
        if (col === 'id') type = 'SERIAL PRIMARY KEY';
        else if (col.includes('lat') || col.includes('lng') || col.includes('longitude') || col.includes('latitude')) type = 'DOUBLE PRECISION';
        else if (col.includes('casualties') || col.includes('injuries') || col.includes('duration')) type = 'INTEGER';
        else if (col.includes('damage')) type = 'DECIMAL';
        else if (col.includes('_at') || col.includes('date')) type = 'TIMESTAMP WITH TIME ZONE';
        else if (typeof value === 'number') type = 'DECIMAL';
        
        return `${col} ${type}`;
      }).join(', ');
      
      await renderPool.query(`CREATE TABLE historical_fires (${createCols})`);
      console.log('   ✅ historical_fires recreated');
    }

    // 2. Fix active_fires table
    console.log('\n🔍 Analyzing active_fires structure...');
    
    const localActiveFires = await localPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'active_fires' 
      ORDER BY ordinal_position
    `);
    
    console.log('Local active_fires columns:');
    localActiveFires.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });

    // Drop and recreate active_fires
    await renderPool.query('DROP TABLE IF EXISTS active_fires CASCADE');
    
    const sampleActiveFire = await localPool.query('SELECT * FROM active_fires LIMIT 1');
    if (sampleActiveFire.rows.length > 0) {
      const columns = Object.keys(sampleActiveFire.rows[0]);
      
      const createCols = columns.map(col => {
        let type = 'TEXT';
        if (col === 'id') type = 'SERIAL PRIMARY KEY';
        else if (col.includes('lat') || col.includes('lng') || col.includes('longitude') || col.includes('latitude')) type = 'DOUBLE PRECISION';
        else if (col.includes('_at') || col.includes('date')) type = 'TIMESTAMP WITH TIME ZONE';
        
        return `${col} ${type}`;
      }).join(', ');
      
      await renderPool.query(`CREATE TABLE active_fires (${createCols})`);
      console.log('   ✅ active_fires recreated');
    }

    // 3. Now migrate the data
    console.log('\n📊 Migrating data...\n');

    // Migrate historical_fires
    console.log('🔄 Migrating historical_fires...');
    try {
      const fires = await localPool.query('SELECT * FROM historical_fires');
      console.log(`   Found ${fires.rows.length} records`);
      
      let count = 0;
      const batchSize = 100;
      
      for (let i = 0; i < fires.rows.length; i += batchSize) {
        const batch = fires.rows.slice(i, i + batchSize);
        
        try {
          await renderPool.query('BEGIN');
          
          for (const fire of batch) {
            const columns = Object.keys(fire);
            const values = Object.values(fire);
            const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
            
            await renderPool.query(
              `INSERT INTO historical_fires (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
            count++;
          }
          
          await renderPool.query('COMMIT');
          console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
        } catch (batchError) {
          await renderPool.query('ROLLBACK');
          console.log(`   ⚠️  Batch failed: ${batchError.message.substring(0, 50)}...`);
        }
      }
      
      console.log(`   ✅ Migrated ${count}/${fires.rows.length} historical fires`);
    } catch (error) {
      console.log(`   ❌ Historical fires failed: ${error.message.substring(0, 60)}...`);
    }

    // Migrate active_fires
    console.log('🔄 Migrating active_fires...');
    try {
      const activeFires = await localPool.query('SELECT * FROM active_fires');
      console.log(`   Found ${activeFires.rows.length} records`);
      
      let count = 0;
      for (const fire of activeFires.rows) {
        try {
          const columns = Object.keys(fire);
          const values = Object.values(fire);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          
          await renderPool.query(
            `INSERT INTO active_fires (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
          count++;
        } catch (insertError) {
          console.log(`   ⚠️  Record failed: ${insertError.message.substring(0, 50)}...`);
        }
      }
      
      console.log(`   ✅ Migrated ${count}/${activeFires.rows.length} active fires`);
    } catch (error) {
      console.log(`   ❌ Active fires failed: ${error.message.substring(0, 60)}...`);
    }

    // Migrate notifications without foreign key constraints
    console.log('🔄 Migrating notifications...');
    try {
      // Drop foreign key constraints if they exist
      await renderPool.query('DROP TABLE IF EXISTS notifications CASCADE');
      await renderPool.query(`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          user_id INTEGER,
          read_status BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const notifications = await localPool.query('SELECT * FROM notifications');
      console.log(`   Found ${notifications.rows.length} records`);
      
      let count = 0;
      for (const notification of notifications.rows) {
        try {
          await renderPool.query(`
            INSERT INTO notifications (id, message, type, user_id, read_status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            notification.id,
            notification.message,
            notification.type || 'info',
            notification.user_id,
            notification.read_status || false,
            notification.created_at
          ]);
          count++;
        } catch (insertError) {
          console.log(`   ⚠️  Record failed: ${insertError.message.substring(0, 50)}...`);
        }
      }
      
      console.log(`   ✅ Migrated ${count}/${notifications.rows.length} notifications`);
    } catch (error) {
      console.log(`   ❌ Notifications failed: ${error.message.substring(0, 60)}...`);
    }

    // Final verification
    console.log('\n🔍 === FINAL VERIFICATION ===\n');

    const tables = ['historical_fires', 'notifications', 'active_fires'];

    for (const tableName of tables) {
      try {
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const renderCount = await renderPool.query(`SELECT COUNT(*) FROM ${tableName}`);
        
        const localNum = parseInt(localCount.rows[0].count);
        const renderNum = parseInt(renderCount.rows[0].count);
        const percentage = localNum > 0 ? Math.round((renderNum / localNum) * 100) : 100;
        const status = percentage >= 90 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
        
        console.log(`${tableName.padEnd(20)} ${localNum.toString().padEnd(8)} → ${renderNum.toString().padEnd(8)} (${percentage}%) ${status}`);
      } catch (error) {
        console.log(`${tableName.padEnd(20)} ❌ Verification failed: ${error.message.substring(0, 40)}...`);
      }
    }

    console.log('\n🎉 Remaining tables migration completed!');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
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
  
  fixRemainingTables(renderUrl);
}

module.exports = { fixRemainingTables };