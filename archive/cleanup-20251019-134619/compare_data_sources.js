const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function findDataDifferences() {
  try {
    console.log('🔍 Deep comparison: Colab CSV vs Production Database\n');
    
    // 1. Read Colab CSV
    console.log('📊 Step 1: Loading Colab CSV data...');
    const csvPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvLines = csvContent.split('\n').filter(line => line.trim());
    
    const colabData = new Map(); // barangay -> Map(date -> count)
    csvLines.forEach(line => {
      const parts = line.split(',');
      if (parts.length === 3) {
        const barangay = parts[0].trim();
        const date = parts[1].trim();
        const count = parseInt(parts[2].trim());
        
        if (!colabData.has(barangay)) {
          colabData.set(barangay, new Map());
        }
        
        // Handle duplicates by summing (same as Python script)
        const existing = colabData.get(barangay).get(date) || 0;
        colabData.get(barangay).set(date, existing + count);
      }
    });
    
    console.log(`   ✅ Loaded ${colabData.size} barangays from Colab CSV\n`);
    
    // 2. Read Production Database
    console.log('📊 Step 2: Loading Production Database data...');
    const dbResult = await db.query(`
      SELECT 
        barangay AS barangay,
        TO_CHAR(DATE_TRUNC('month', resolved_at), 'YYYY-MM') AS date,
        COUNT(*) AS incident_count
      FROM historical_fires
      WHERE resolved_at IS NOT NULL
      GROUP BY barangay, DATE_TRUNC('month', resolved_at)
      ORDER BY barangay, DATE_TRUNC('month', resolved_at)
    `);
    
    const dbData = new Map(); // barangay -> Map(date -> count)
    dbResult.rows.forEach(row => {
      const barangay = row.barangay;
      const date = row.date;
      const count = parseInt(row.incident_count);
      
      if (!dbData.has(barangay)) {
        dbData.set(barangay, new Map());
      }
      dbData.get(barangay).set(date, count);
    });
    
    console.log(`   ✅ Loaded ${dbData.size} barangays from Database\n`);
    
    // 3. Compare barangay names
    console.log('═'.repeat(100));
    console.log('STEP 3: BARANGAY NAME COMPARISON');
    console.log('═'.repeat(100));
    
    const colabBarangays = Array.from(colabData.keys()).sort();
    const dbBarangays = Array.from(dbData.keys()).sort();
    
    console.log(`\nColab barangays: ${colabBarangays.length}`);
    console.log(`Database barangays: ${dbBarangays.length}\n`);
    
    const onlyInColab = colabBarangays.filter(b => !dbBarangays.includes(b));
    const onlyInDb = dbBarangays.filter(b => !colabBarangays.includes(b));
    
    if (onlyInColab.length > 0) {
      console.log('⚠️  Barangays ONLY in Colab CSV:');
      onlyInColab.forEach(b => {
        const recordCount = colabData.get(b).size;
        console.log(`   - ${b} (${recordCount} records)`);
      });
      console.log('');
    }
    
    if (onlyInDb.length > 0) {
      console.log('⚠️  Barangays ONLY in Database:');
      onlyInDb.forEach(b => {
        const recordCount = dbData.get(b).size;
        console.log(`   - ${b} (${recordCount} records)`);
      });
      console.log('');
    }
    
    // 4. Compare data for common barangays
    console.log('═'.repeat(100));
    console.log('STEP 4: DATA COMPARISON FOR COMMON BARANGAYS');
    console.log('═'.repeat(100));
    
    const commonBarangays = colabBarangays.filter(b => dbBarangays.includes(b));
    console.log(`\nAnalyzing ${commonBarangays.length} common barangays...\n`);
    
    let totalDifferences = 0;
    const detailedDifferences = [];
    
    for (const barangay of commonBarangays) {
      const colabDates = colabData.get(barangay);
      const dbDates = dbData.get(barangay);
      
      const allDates = new Set([...colabDates.keys(), ...dbDates.keys()]);
      const differences = [];
      
      for (const date of allDates) {
        const colabCount = colabDates.get(date) || 0;
        const dbCount = dbDates.get(date) || 0;
        
        if (colabCount !== dbCount) {
          differences.push({
            date,
            colabCount,
            dbCount,
            diff: Math.abs(colabCount - dbCount)
          });
          totalDifferences++;
        }
      }
      
      if (differences.length > 0) {
        detailedDifferences.push({
          barangay,
          totalRecordsColab: colabDates.size,
          totalRecordsDb: dbDates.size,
          differences
        });
      }
    }
    
    console.log(`Total differences found: ${totalDifferences}\n`);
    
    if (detailedDifferences.length > 0) {
      console.log('─'.repeat(100));
      console.log('BARANGAYS WITH DIFFERENCES:');
      console.log('─'.repeat(100));
      
      // Show summary
      detailedDifferences.forEach(item => {
        console.log(`\n${item.barangay}:`);
        console.log(`  Colab records: ${item.totalRecordsColab}`);
        console.log(`  Database records: ${item.totalRecordsDb}`);
        console.log(`  Differences: ${item.differences.length}`);
        
        // Show first 10 differences
        const showCount = Math.min(10, item.differences.length);
        console.log(`  Showing ${showCount} of ${item.differences.length} differences:\n`);
        
        item.differences.slice(0, showCount).forEach(d => {
          console.log(`    ${d.date}: Colab=${d.colabCount}, DB=${d.dbCount} (diff: ${d.diff})`);
        });
        
        if (item.differences.length > 10) {
          console.log(`    ... and ${item.differences.length - 10} more`);
        }
      });
    } else {
      console.log('✅ No differences found in common barangays!');
    }
    
    // 5. Focus on Addition Hills (the test case)
    console.log('\n');
    console.log('═'.repeat(100));
    console.log('STEP 5: ADDITION HILLS DETAILED COMPARISON');
    console.log('═'.repeat(100));
    
    const additionHillsColab = colabData.get('Addition Hills');
    const additionHillsDb = dbData.get('Addition Hills');
    
    if (additionHillsColab && additionHillsDb) {
      console.log(`\nColab records: ${additionHillsColab.size}`);
      console.log(`Database records: ${additionHillsDb.size}\n`);
      
      const allDates = new Set([
        ...additionHillsColab.keys(),
        ...additionHillsDb.keys()
      ]);
      const sortedDates = Array.from(allDates).sort();
      
      console.log('─'.repeat(80));
      console.log('Date'.padEnd(15) + 'Colab'.padEnd(10) + 'Database'.padEnd(10) + 'Match');
      console.log('─'.repeat(80));
      
      let matches = 0;
      let mismatches = 0;
      
      sortedDates.forEach(date => {
        const colabCount = additionHillsColab.get(date) || 0;
        const dbCount = additionHillsDb.get(date) || 0;
        const match = colabCount === dbCount;
        
        if (match) {
          matches++;
        } else {
          mismatches++;
          console.log(
            date.padEnd(15) +
            String(colabCount).padEnd(10) +
            String(dbCount).padEnd(10) +
            '❌ MISMATCH'
          );
        }
      });
      
      console.log('─'.repeat(80));
      console.log(`\nMatches: ${matches}`);
      console.log(`Mismatches: ${mismatches}`);
      console.log(`Match Rate: ${((matches / sortedDates.length) * 100).toFixed(1)}%`);
    }
    
    // 6. Summary and Statistics
    console.log('\n');
    console.log('═'.repeat(100));
    console.log('SUMMARY');
    console.log('═'.repeat(100));
    
    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Barangays in Colab only: ${onlyInColab.length}`);
    console.log(`   Barangays in Database only: ${onlyInDb.length}`);
    console.log(`   Common barangays: ${commonBarangays.length}`);
    console.log(`   Barangays with data differences: ${detailedDifferences.length}`);
    console.log(`   Total date-level differences: ${totalDifferences}`);
    
    console.log(`\n💡 Conclusion:`);
    if (totalDifferences === 0 && onlyInColab.length === 0 && onlyInDb.length === 0) {
      console.log('   ✅ Data is IDENTICAL - no differences found!');
      console.log('   The issue must be elsewhere in the pipeline.');
    } else {
      console.log(`   ❌ Data is DIFFERENT - found ${totalDifferences} mismatches.`);
      console.log('   This explains why production selects different ARIMA models.');
      console.log('   Different historical data → Different patterns → Different optimal models.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findDataDifferences();
