require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function properImport() {
  console.log('🔄 Proper import: Original data + Synthetic gaps only...\n');
  
  // Step 1: Read the COMPLETE dataset (which already has correct mix)
  const completePath = path.join(__dirname, '..', 'mightbecorrectdata_complete.csv');
  const completeContent = fs.readFileSync(completePath, 'utf-8');
  const completeLines = completeContent.split('\n').filter(line => line.trim());
  const header = completeLines[0];
  
  console.log(`📊 Complete dataset: ${completeLines.length - 1} records\n`);
  
  // Step 2: Parse ALL records from complete dataset
  const allRecords = [];
  
  console.log('📥 Parsing all records (original with full data + synthetic with minimal data)...\n');
  
  for (let i = 1; i < completeLines.length; i++) {
    const line = completeLines[i];
    const parts = line.split(',');
    
    const dateStr = parts[0].trim();
    const location = parts[1] ? parts[1].trim().replace(/^"|"$/g, '') : null;
    const occupancyType = parts[2] ? parts[2].trim() : null;
    const natureOfFire = parts[3] ? parts[3].trim() : null;
    const alarmStatus = parts[4] ? parts[4].trim() : null;
    const casualtyStr = parts[5] ? parts[5].trim() : null;
    const injuryStr = parts[6] ? parts[6].trim() : null;
    const damageStr = parts[7] ? parts[7].trim() : null;
    const barangay = parts[parts.length - 1].trim();
    
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);
    const resolvedAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    // Determine if synthetic (all columns except first and last are empty)
    const isSynthetic = parts.slice(1, parts.length - 1).every(p => !p || !p.trim());
    
    if (!isSynthetic) {
      // Original record with full data
      const casualties = casualtyStr && casualtyStr !== 'NEGATIVE' ? parseInt(casualtyStr) || 0 : 0;
      const injuries = injuryStr && injuryStr !== 'NEGATIVE' ? parseInt(injuryStr) || 0 : 0;
      
      let estimatedDamage = null;
      if (damageStr && damageStr.includes('PHP')) {
        const damageMatch = damageStr.match(/PHP\s*([\d,]+\.?\d*)/);
        if (damageMatch) {
          estimatedDamage = parseFloat(damageMatch[1].replace(/,/g, ''));
        }
      }
      
      allRecords.push({
        barangay,
        resolvedAt,
        address: location,
        alarmLevel: alarmStatus,
        casualties,
        injuries,
        estimatedDamage,
        cause: natureOfFire,
        isSynthetic: false
      });
    } else {
      // Synthetic record with minimal data
      allRecords.push({
        barangay,
        resolvedAt,
        address: null,
        alarmLevel: null,
        casualties: 0,
        injuries: 0,
        estimatedDamage: null,
        cause: null,
        isSynthetic: true
      });
    }
  }
  
  const originalCount = allRecords.filter(r => !r.isSynthetic).length;
  const syntheticCount = allRecords.filter(r => r.isSynthetic).length;
  
  console.log(`   ✅ Parsed ${originalCount} original records with full data`);
  console.log(`   ✅ Parsed ${syntheticCount} synthetic records with minimal data`);
  console.log(`   📊 Total: ${allRecords.length} records\n`);
  
  // Step 3: Import to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  try {
    console.log('🔌 Connecting to database...\n');
    
    // Clear current data
    console.log('🗑️  Clearing current historical_fires...');
    const deleteResult = await pool.query('DELETE FROM historical_fires');
    console.log(`   ✅ Deleted ${deleteResult.rowCount} records\n`);
    
    // Insert all records
    console.log('📥 Inserting records (original + synthetic)...\n');
    
    let inserted = 0;
    const batchSize = 100;
    
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      
      const values = [];
      const placeholders = [];
      
      batch.forEach((record, idx) => {
        const baseIdx = idx * 9;
        const uuid = require('crypto').randomUUID();
        placeholders.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8}, $${baseIdx + 9})`);
        values.push(
          uuid,
          record.barangay,
          record.resolvedAt,
          0, // lat
          0, // lng
          record.address,
          record.alarmLevel,
          record.casualties,
          record.injuries
        );
      });
      
      await pool.query(`
        INSERT INTO historical_fires (id, barangay, resolved_at, lat, lng, address, alarm_level, casualties, injuries)
        VALUES ${placeholders.join(', ')}
      `, values);
      
      inserted += batch.length;
      
      if (inserted % 200 === 0 || inserted === allRecords.length) {
        process.stdout.write(`\r   Progress: ${inserted}/${allRecords.length} (${(inserted/allRecords.length*100).toFixed(1)}%)...`);
      }
    }
    
    console.log(`\n   ✅ Inserted ${inserted} records\n`);
    
    // Verify
    console.log('✅ Verifying...\n');
    
    const totalResult = await pool.query('SELECT COUNT(*) FROM historical_fires');
    const originalCount = await pool.query('SELECT COUNT(*) FROM historical_fires WHERE address IS NOT NULL');
    const syntheticCount = await pool.query('SELECT COUNT(*) FROM historical_fires WHERE address IS NULL');
    
    console.log('═'.repeat(80));
    console.log('📊 IMPORT SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Total records: ${totalResult.rows[0].count}`);
    console.log(`📝 Original records (with full data): ${originalCount.rows[0].count}`);
    console.log(`🔧 Synthetic records (minimal data): ${syntheticCount.rows[0].count}`);
    console.log('═'.repeat(80));
    
    // Verify aggregation
    const aggregatedResult = await pool.query(`
      SELECT 
        barangay,
        TO_CHAR(resolved_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM historical_fires
      GROUP BY barangay, TO_CHAR(resolved_at, 'YYYY-MM')
      ORDER BY barangay, month
    `);
    
    // Compare with datatoforecasts
    const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    const datatoforecastsContent = fs.readFileSync(datatoforecastsPath, 'utf-8');
    const datatoforecastsLines = datatoforecastsContent.split('\n').filter(line => line.trim()).slice(1);
    
    const targetMap = new Map();
    for (const line of datatoforecastsLines) {
      const [barangay, date, count] = line.split(',');
      const key = `${barangay.trim()}|${date.trim()}`;
      targetMap.set(key, parseInt(count));
    }
    
    const dbMap = new Map();
    aggregatedResult.rows.forEach(row => {
      const key = `${row.barangay}|${row.month}`;
      dbMap.set(key, parseInt(row.count));
    });
    
    let matches = 0;
    for (const [key, targetCount] of targetMap) {
      const dbCount = dbMap.get(key) || 0;
      if (dbCount === targetCount) matches++;
    }
    
    console.log(`\n✅ Aggregation match: ${matches}/${targetMap.size} (${(matches/targetMap.size*100).toFixed(1)}%)\n`);
    
    if (matches === targetMap.size) {
      console.log('🎉 100% MATCH! Database is ready!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

properImport();
