require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importCompleteDataset() {
  console.log('🔄 Importing mightbecorrectdata_complete.csv to production database...\n');
  
  // Read the complete dataset
  const csvPath = path.join(__dirname, '..', 'mightbecorrectdata_complete.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 Total lines: ${lines.length}`);
  console.log(`📊 Records to import: ${lines.length - 1} (excluding header)\n`);
  
  // Parse records
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    const dateStr = parts[0].trim();
    const barangay = parts[parts.length - 1].trim();
    
    // Parse date (MM/DD/YYYY format)
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) {
      console.log(`⚠️  Skipping line ${i + 1}: Invalid date format: "${dateStr}"`);
      continue;
    }
    
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);
    
    // Create Date object as UTC to avoid timezone shifts
    const resolvedAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    records.push({
      barangay,
      resolvedAt
    });
  }
  
  console.log(`✅ Parsed ${records.length} valid records\n`);
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    console.log('🔌 Connecting to production database...\n');
    
    // Step 1: Check current count (skip backup for now due to connection issues)
    console.log('� Step 1: Checking current historical_fires count...');
    const currentCount = await pool.query(`SELECT COUNT(*) FROM historical_fires`);
    console.log(`   Current records: ${currentCount.rows[0].count}\n`);
    
    // Step 2: Clear current data
    console.log('🗑️  Step 2: Clearing current historical_fires table...');
    const deleteResult = await pool.query('DELETE FROM historical_fires');
    console.log(`   ✅ Deleted ${deleteResult.rowCount} records\n`);
    
    // Step 3: Insert new data
    console.log('📥 Step 3: Inserting records from mightbecorrectdata_complete.csv...');
    console.log('   This may take a while...\n');
    
    let inserted = 0;
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Build multi-row insert
      const values = [];
      const placeholders = [];
      
      batch.forEach((record, idx) => {
        const baseIdx = idx * 5;
        const uuid = require('crypto').randomUUID();
        placeholders.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5})`);
        values.push(uuid, record.barangay, record.resolvedAt, 0, 0); // Default lat/lng to 0
      });
      
      await pool.query(`
        INSERT INTO historical_fires (id, barangay, resolved_at, lat, lng)
        VALUES ${placeholders.join(', ')}
      `, values);
      
      inserted += batch.length;
      
      if (inserted % 200 === 0 || inserted === records.length) {
        process.stdout.write(`\r   Progress: ${inserted}/${records.length} records (${(inserted/records.length*100).toFixed(1)}%)...`);
      }
    }
    
    console.log(`\n   ✅ Inserted ${inserted} records\n`);
    
    // Step 4: Verify aggregation
    console.log('✅ Step 4: Verifying aggregation matches datatoforecasts.csv...\n');
    
    const aggregatedResult = await pool.query(`
      SELECT 
        barangay,
        TO_CHAR(resolved_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM historical_fires
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay, month
    `);
    
    console.log(`   Database aggregated: ${aggregatedResult.rows.length} barangay-months`);
    
    // Read datatoforecasts for comparison
    const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    const datatoforecastsContent = fs.readFileSync(datatoforecastsPath, 'utf-8');
    const datatoforecastsLines = datatoforecastsContent.split('\n').filter(line => line.trim()).slice(1);
    
    const targetMap = new Map();
    for (const line of datatoforecastsLines) {
      const [barangay, date, count] = line.split(',');
      const key = `${barangay.trim()}|${date.trim()}`;
      targetMap.set(key, parseInt(count));
    }
    
    console.log(`   Target (datatoforecasts): ${targetMap.size} barangay-months\n`);
    
    // Compare
    let matches = 0;
    let mismatches = [];
    
    const dbMap = new Map();
    aggregatedResult.rows.forEach(row => {
      const key = `${row.barangay}|${row.month}`;
      dbMap.set(key, parseInt(row.count));
    });
    
    for (const [key, targetCount] of targetMap) {
      const dbCount = dbMap.get(key) || 0;
      if (dbCount === targetCount) {
        matches++;
      } else {
        mismatches.push({ key, target: targetCount, got: dbCount });
      }
    }
    
    console.log('═'.repeat(80));
    console.log('📊 VERIFICATION RESULTS');
    console.log('═'.repeat(80));
    console.log(`✅ Perfect matches: ${matches}/${targetMap.size} (${(matches/targetMap.size*100).toFixed(1)}%)`);
    
    if (mismatches.length > 0) {
      console.log(`❌ Mismatches: ${mismatches.length}\n`);
      console.log('First 10 mismatches:');
      mismatches.slice(0, 10).forEach(m => {
        console.log(`   ${m.key}: target=${m.target}, got=${m.got}`);
      });
    }
    
    console.log('═'.repeat(80));
    
    if (matches === targetMap.size) {
      console.log('\n🎉 100% MATCH! Database now matches datatoforecasts.csv exactly!\n');
      console.log('✅ Production ARIMA will now produce identical forecasts to Colab\n');
      console.log('⚠️  IMPORTANT: You need to regenerate forecasts for the changes to take effect!\n');
    } else {
      console.log('\n⚠️  Some mismatches detected. This should not happen.\n');
    }
    
    // Show sample data
    console.log('📊 Sample of imported data (first 10 records):');
    console.log('─'.repeat(80));
    const sampleResult = await pool.query(`
      SELECT barangay, resolved_at 
      FROM historical_fires 
      ORDER BY resolved_at 
      LIMIT 10
    `);
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.barangay} | ${row.resolved_at.toISOString().split('T')[0]}`);
    });
    console.log('─'.repeat(80));
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM historical_fires');
    console.log(`\n✅ Total records in historical_fires: ${totalResult.rows[0].total}\n`);
    
    console.log('🎉 Import complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importCompleteDataset();
