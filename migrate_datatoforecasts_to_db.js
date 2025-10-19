require('dotenv').config();
const { Pool } = require('pg');

async function migrateDatatoforecasts() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🔄 Migrating datatoforecasts.csv to production database...\n');
  
  // Read datatoforecasts.csv
  const csvPath = path.join(__dirname, '..', 'datatoforecasts.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim()).slice(1); // Skip header
  
  console.log(`📊 Read ${lines.length} records from datatoforecasts.csv\n`);
  
  //Parse the CSV
  const records = [];
  for (const line of lines) {
    const [barangay, date, count] = line.split(',');
    const [year, month] = date.split('-');
    
    records.push({
      barangay: barangay.trim(),
      year: parseInt(year),
      month: parseInt(month),
      count: parseInt(count)
    });
  }
  
  console.log(`✅ Parsed ${records.length} records\n`);
  console.log(`📅 Date range: ${records[0].year}-${records[0].month} to ${records[records.length-1].year}-${records[records.length-1].month}\n`);
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('🔌 Connecting to production database...\n');
    
    // Step 1: Backup current data
    console.log('💾 Step 1: Creating backup of current historical_fires...');
    const backupResult = await pool.query(`
      CREATE TABLE IF NOT EXISTS historical_fires_backup_${Date.now()} AS 
      SELECT * FROM historical_fires
    `);
    console.log(`   ✅ Backup created\n`);
    
    // Step 2: Clear current data
    console.log('🗑️  Step 2: Clearing current historical_fires...');
    const deleteResult = await pool.query('DELETE FROM historical_fires');
    console.log(`   ✅ Deleted ${deleteResult.rowCount} records\n`);
    
    // Step 3: Insert new data
    console.log('📥 Step 3: Inserting data from datatoforecasts.csv...');
    
    // Generate fake resolved_at dates based on year-month
    // Each barangay-month will have 'count' number of fire records
    let inserted = 0;
    
    for (const record of records) {
      // Create 'count' number of fire records for this barangay-month
      for (let i = 0; i < record.count; i++) {
        // Generate a random day in the month
        const daysInMonth = new Date(record.year, record.month, 0).getDate();
        const day = Math.floor(Math.random() * daysInMonth) + 1;
        const resolved_at = new Date(record.year, record.month - 1, day);
        
        await pool.query(`
          INSERT INTO historical_fires (barangay_name, resolved_at, created_at)
          VALUES ($1, $2, NOW())
        `, [record.barangay, resolved_at]);
        
        inserted++;
      }
      
      if (inserted % 100 === 0) {
        process.stdout.write(`\r   Progress: ${inserted}/${records.reduce((sum, r) => sum + r.count, 0)} records...`);
      }
    }
    
    console.log(`\n   ✅ Inserted ${inserted} fire incident records\n`);
    
    // Step 4: Verify
    console.log('✅ Step 4: Verifying...');
    const verifyResult = await pool.query(`
      SELECT 
        barangay_name,
        TO_CHAR(resolved_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM historical_fires
      GROUP BY barangay_name, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay_name, month
      LIMIT 10
    `);
    
    console.log('\n📊 Sample of aggregated data (first 10 records):');
    console.log('─'.repeat(80));
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.barangay_name} | ${row.month} | Count: ${row.count}`);
    });
    console.log('─'.repeat(80));
    
    // Count total
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM historical_fires');
    console.log(`\n✅ Total records in historical_fires: ${totalResult.rows[0].total}\n`);
    
    console.log('🎉 Migration complete!');
    console.log('   Your production database now matches datatoforecasts.csv\n');
    console.log('⚠️  IMPORTANT: You need to regenerate forecasts for 100% match with Colab!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateDatatoforecasts();
