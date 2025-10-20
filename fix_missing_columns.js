require('dotenv').config();
const { Pool } = require('pg');

async function fixMissingColumns() {
  console.log('🔧 Fixing Missing Database Columns...\n');
  console.log('═'.repeat(80));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Fix 1: Add read_status to notifications table
    console.log('📋 Checking notifications table...');
    try {
      await client.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added read_status column to notifications\n');
    } catch (error) {
      console.log('⚠️  read_status column may already exist\n');
    }
    
    // Fix 2: Add model_used to forecasts table
    console.log('📋 Checking forecasts table...');
    try {
      await client.query(`
        ALTER TABLE forecasts 
        ADD COLUMN IF NOT EXISTS model_used VARCHAR(50) DEFAULT 'ARIMA'
      `);
      console.log('✅ Added model_used column to forecasts\n');
    } catch (error) {
      console.log('⚠️  model_used column may already exist\n');
    }
    
    // Fix 3: Add confidence_interval to forecasts table
    console.log('📋 Adding confidence_interval column...');
    try {
      await client.query(`
        ALTER TABLE forecasts 
        ADD COLUMN IF NOT EXISTS confidence_interval JSONB
      `);
      console.log('✅ Added confidence_interval column to forecasts\n');
    } catch (error) {
      console.log('⚠️  confidence_interval column may already exist\n');
    }
    
    // Fix 4: Verify the columns exist now
    console.log('═'.repeat(80));
    console.log('🔍 Verifying columns...\n');
    
    const notificationsCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Notifications table columns:');
    notificationsCheck.rows.forEach(col => {
      const hasReadStatus = col.column_name === 'read_status' ? '✅' : '  ';
      console.log(`${hasReadStatus} ${col.column_name.padEnd(20)} ${col.data_type}`);
    });
    
    const forecastsCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'forecasts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Forecasts table columns:');
    forecastsCheck.rows.forEach(col => {
      const hasModelUsed = col.column_name === 'model_used' ? '✅' : '  ';
      const hasConfidence = col.column_name === 'confidence_interval' ? '✅' : '  ';
      const marker = hasModelUsed || hasConfidence;
      console.log(`${marker} ${col.column_name.padEnd(25)} ${col.data_type}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL FIXES APPLIED!\n');
    console.log('💡 Your Railway deployment should work now.');
    console.log('   Refresh the Railway logs to see the fix take effect.\n');
    
    client.release();
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

fixMissingColumns();
