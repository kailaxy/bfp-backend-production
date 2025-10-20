const fs = require('fs');
const path = require('path');

function analyzeDifferences() {
  console.log('🔍 Analyzing why processed_mightbecorrectdata.csv != datatoforecasts.csv\n');
  
  // Read both files (BOTH ARE ALREADY AGGREGATED)
  const processedPath = path.join(__dirname, '..', 'processed_fixed_mightbecorrectdata.csv');
  const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
  
  console.log('📂 Reading aggregated files...');
  const processed = fs.readFileSync(processedPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .slice(1); // Skip header
  
  const datatoforecasts = fs.readFileSync(datatoforecastsPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .slice(1); // Skip header
  
  console.log(`   Processed (mightbecorrectdata_fixed aggregated): ${processed.length} records`);
  console.log(`   Datatoforecasts (Colab aggregated): ${datatoforecasts.length} records\n`);
  
  // Parse into maps - both are already aggregated!
  const processedMap = new Map();
  const datatoforecastsMap = new Map();
  
  processed.forEach(line => {
    const [barangay, date, count] = line.split(',');
    const key = `${barangay.trim()}|${date.trim()}`;
    processedMap.set(key, parseInt(count));
  });
  
  datatoforecasts.forEach(line => {
    const [barangay, date, count] = line.split(',');
    const key = `${barangay.trim()}|${date.trim()}`;
    datatoforecastsMap.set(key, parseInt(count));
  });
  
  // Find differences
  console.log('🔍 Analyzing differences...\n');
  
  const mismatches = [];
  const onlyInDatatoforecasts = [];
  const onlyInProcessed = [];
  
  // Check datatoforecasts against processed
  for (const [key, count] of datatoforecastsMap) {
    if (!processedMap.has(key)) {
      onlyInDatatoforecasts.push({ key, count });
    } else if (processedMap.get(key) !== count) {
      mismatches.push({
        key,
        datatoforecasts: count,
        processed: processedMap.get(key),
        diff: count - processedMap.get(key)
      });
    }
  }
  
  // Check processed against datatoforecasts
  for (const [key, count] of processedMap) {
    if (!datatoforecastsMap.has(key)) {
      onlyInProcessed.push({ key, count });
    }
  }
  
  // Report mismatches
  console.log('═'.repeat(100));
  console.log('📊 MISMATCHES (Different Counts for Same Barangay-Month)');
  console.log('═'.repeat(100));
  console.log(`Total: ${mismatches.length} records\n`);
  
  // Group by barangay
  const mismatchByBarangay = new Map();
  mismatches.forEach(m => {
    const [barangay, date] = m.key.split('|');
    if (!mismatchByBarangay.has(barangay)) {
      mismatchByBarangay.set(barangay, []);
    }
    mismatchByBarangay.get(barangay).push({ date, ...m });
  });
  
  // Show by barangay
  for (const [barangay, records] of mismatchByBarangay) {
    console.log(`\n🏘️  ${barangay} (${records.length} mismatches):`);
    console.log('─'.repeat(100));
    records.slice(0, 10).forEach(r => {
      console.log(`   ${r.date}: datatoforecasts=${r.datatoforecasts}, processed=${r.processed} (diff: ${r.diff > 0 ? '+' : ''}${r.diff})`);
    });
    if (records.length > 10) {
      console.log(`   ... and ${records.length - 10} more`);
    }
  }
  
  // Report only in datatoforecasts
  console.log('\n\n═'.repeat(100));
  console.log('📊 ONLY IN DATATOFORECASTS.CSV (Missing from processed)');
  console.log('═'.repeat(100));
  console.log(`Total: ${onlyInDatatoforecasts.length} records\n`);
  
  // Group by barangay
  const onlyDatatoforecastsByBarangay = new Map();
  onlyInDatatoforecasts.forEach(item => {
    const [barangay, date] = item.key.split('|');
    if (!onlyDatatoforecastsByBarangay.has(barangay)) {
      onlyDatatoforecastsByBarangay.set(barangay, []);
    }
    onlyDatatoforecastsByBarangay.get(barangay).push({ date, count: item.count });
  });
  
  for (const [barangay, records] of onlyDatatoforecastsByBarangay) {
    console.log(`\n🏘️  ${barangay} (${records.length} records):`);
    console.log('─'.repeat(100));
    
    // Group by year
    const byYear = new Map();
    records.forEach(r => {
      const year = r.date.split('-')[0];
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(r);
    });
    
    for (const [year, yearRecords] of [...byYear.entries()].sort()) {
      const months = yearRecords.map(r => r.date.split('-')[1]).join(', ');
      const totalCount = yearRecords.reduce((sum, r) => sum + r.count, 0);
      console.log(`   ${year}: ${yearRecords.length} months (${months}) - Total: ${totalCount} incidents`);
    }
  }
  
  // Report only in processed
  console.log('\n\n═'.repeat(100));
  console.log('📊 ONLY IN PROCESSED (Missing from datatoforecasts)');
  console.log('═'.repeat(100));
  console.log(`Total: ${onlyInProcessed.length} records\n`);
  
  // Group by barangay
  const onlyProcessedByBarangay = new Map();
  onlyInProcessed.forEach(item => {
    const [barangay, date] = item.key.split('|');
    if (!onlyProcessedByBarangay.has(barangay)) {
      onlyProcessedByBarangay.set(barangay, []);
    }
    onlyProcessedByBarangay.get(barangay).push({ date, count: item.count });
  });
  
  for (const [barangay, records] of onlyProcessedByBarangay) {
    console.log(`\n🏘️  ${barangay} (${records.length} records):`);
    console.log('─'.repeat(100));
    
    // Group by year
    const byYear = new Map();
    records.forEach(r => {
      const year = r.date.split('-')[0];
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(r);
    });
    
    for (const [year, yearRecords] of [...byYear.entries()].sort()) {
      const months = yearRecords.map(r => r.date.split('-')[1]).join(', ');
      const totalCount = yearRecords.reduce((sum, r) => sum + r.count, 0);
      console.log(`   ${year}: ${yearRecords.length} months (${months}) - Total: ${totalCount} incidents`);
    }
  }
  
  // Summary
  console.log('\n\n═'.repeat(100));
  console.log('📊 SUMMARY - WHY NOT 100% MATCH?');
  console.log('═'.repeat(100));
  console.log(`\n1. Mismatches (different counts): ${mismatches.length}`);
  console.log(`   → These months exist in both but have different incident counts`);
  console.log(`   → Possible reasons: data corrections, duplicate handling, manual edits\n`);
  
  console.log(`2. Only in datatoforecasts: ${onlyInDatatoforecasts.length}`);
  console.log(`   → These months are in Colab data but NOT in mightbecorrectdata.csv`);
  console.log(`   → Possible reasons: additional records added, different time range\n`);
  
  console.log(`3. Only in processed: ${onlyInProcessed.length}`);
  console.log(`   → These months are in mightbecorrectdata.csv but NOT in Colab data`);
  console.log(`   → Possible reasons: records removed/filtered, data cleaning\n`);
  
  // Check date ranges
  console.log('\n═'.repeat(100));
  console.log('📅 DATE RANGE ANALYSIS');
  console.log('═'.repeat(100));
  
  const processedDates = [...processedMap.keys()].map(k => k.split('|')[1]).sort();
  const datatoforecastsDates = [...datatoforecastsMap.keys()].map(k => k.split('|')[1]).sort();
  
  console.log(`\nProcessed (mightbecorrectdata.csv):`);
  console.log(`   Earliest: ${processedDates[0]}`);
  console.log(`   Latest: ${processedDates[processedDates.length - 1]}`);
  
  console.log(`\nDatatoforecasts (Colab):`);
  console.log(`   Earliest: ${datatoforecastsDates[0]}`);
  console.log(`   Latest: ${datatoforecastsDates[datatoforecastsDates.length - 1]}`);
  
  console.log('\n✅ Analysis complete!\n');
}

analyzeDifferences();
