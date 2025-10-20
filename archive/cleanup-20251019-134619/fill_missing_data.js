const fs = require('fs');
const path = require('path');

function fillMissingData() {
  console.log('🔧 Creating synthetic raw data to match datatoforecasts.csv...\n');
  
  // Step 1: Read datatoforecasts.csv (the target aggregated data)
  const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
  const datatoforecastsContent = fs.readFileSync(datatoforecastsPath, 'utf-8');
  const datatoforecastsLines = datatoforecastsContent.split('\n').filter(line => line.trim()).slice(1);
  
  const targetMap = new Map();
  for (const line of datatoforecastsLines) {
    const [barangay, date, count] = line.split(',');
    const key = `${barangay.trim()}|${date.trim()}`;
    targetMap.set(key, parseInt(count));
  }
  
  console.log(`📊 Target (datatoforecasts.csv): ${targetMap.size} records\n`);
  
  // Step 2: Read mightbecorrectdata_fixed.csv (current raw data)
  const fixedPath = path.join(__dirname, '..', 'mightbecorrectdata_fixed.csv');
  const fixedContent = fs.readFileSync(fixedPath, 'utf-8');
  const fixedLines = fixedContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 Current raw data: ${fixedLines.length - 1} records (excluding header)\n`);
  
  // Step 3: Aggregate current data
  const currentMap = new Map();
  const existingRecordsByKey = new Map(); // Track existing records per barangay-month
  
  for (let i = 1; i < fixedLines.length; i++) {
    const line = fixedLines[i];
    const parts = line.split(',');
    const dateStr = parts[0].trim();
    const barangay = parts[parts.length - 1].trim();
    
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const month = dateMatch[1].padStart(2, '0');
    const year = dateMatch[3];
    const yearMonth = `${year}-${month}`;
    const key = `${barangay}|${yearMonth}`;
    
    currentMap.set(key, (currentMap.get(key) || 0) + 1);
    
    if (!existingRecordsByKey.has(key)) {
      existingRecordsByKey.set(key, []);
    }
    existingRecordsByKey.get(key).push(line);
  }
  
  console.log(`📊 Current aggregated: ${currentMap.size} unique barangay-months\n`);
  
  // Step 4: Find differences
  const needsMore = [];
  const needsLess = [];
  const missing = [];
  
  for (const [key, targetCount] of targetMap) {
    const currentCount = currentMap.get(key) || 0;
    
    if (currentCount < targetCount) {
      needsMore.push({ key, current: currentCount, target: targetCount, diff: targetCount - currentCount });
    } else if (currentCount > targetCount) {
      needsLess.push({ key, current: currentCount, target: targetCount, diff: currentCount - targetCount });
    }
  }
  
  // Find completely missing barangay-months
  for (const [key, targetCount] of targetMap) {
    if (!currentMap.has(key)) {
      missing.push({ key, target: targetCount });
    }
  }
  
  console.log('═'.repeat(80));
  console.log('📊 ANALYSIS');
  console.log('═'.repeat(80));
  console.log(`✅ Exact matches: ${targetMap.size - needsMore.length - needsLess.length - missing.length}`);
  console.log(`➕ Need MORE incidents: ${needsMore.length} barangay-months`);
  console.log(`➖ Need LESS incidents: ${needsLess.length} barangay-months`);
  console.log(`🆕 Completely missing: ${missing.length} barangay-months\n`);
  
  // Step 5: Generate synthetic records
  const syntheticRecords = [];
  let addedCount = 0;
  let modifiedCount = 0;
  
  // Combine needsMore and missing into one list
  const allNeeds = [
    ...needsMore.map(item => ({ ...item, current: item.current || 0, needed: item.diff })),
    ...missing.map(item => ({ key: item.key, current: 0, target: item.target, needed: item.target }))
  ];
  
  console.log(`➕ Adding synthetic records for ${allNeeds.length} barangay-months...\n`);
  
  for (const item of allNeeds) {
    const [barangay, yearMonth] = item.key.split('|');
    const [year, month] = yearMonth.split('-');
    
    // Generate synthetic records for what's needed
    for (let i = 0; i < item.needed; i++) {
      // Random day in the month
      const daysInMonth = new Date(year, parseInt(month), 0).getDate();
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const dateStr = `${month}/${day.toString().padStart(2, '0')}/${year}`;
      
      // Create synthetic record with minimal data
      const syntheticRecord = `${dateStr},,,,,,,,${barangay}`;
      syntheticRecords.push(syntheticRecord);
      addedCount++;
    }
  }
  
  console.log(`   ✅ Generated ${addedCount} synthetic records\n`);
  
  // Step 6: Handle barangay-months with TOO MANY incidents
  let newFixedLines = [...fixedLines];
  let removedCount = 0;
  
  if (needsLess.length > 0) {
    console.log('➖ Removing excess records from barangay-months with too many incidents...\n');
    
    for (const item of needsLess) {
      const existingRecords = existingRecordsByKey.get(item.key) || [];
      
      // Remove the excess records (keep only target amount)
      const recordsToRemove = existingRecords.slice(item.target);
      
      for (const record of recordsToRemove) {
        const index = newFixedLines.indexOf(record);
        if (index > 0) {
          newFixedLines.splice(index, 1);
          removedCount++;
        }
      }
    }
    
    console.log(`   ✅ Removed ${removedCount} excess records\n`);
  }
  
  // Step 7: Combine and write
  console.log('💾 Writing complete dataset...\n');
  
  const outputLines = [...newFixedLines, ...syntheticRecords];
  const outputPath = path.join(__dirname, '..', 'mightbecorrectdata_complete.csv');
  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  
  console.log(`✅ Saved to: mightbecorrectdata_complete.csv`);
  console.log(`📊 Total records: ${outputLines.length - 1} (excluding header)`);
  console.log(`   Original: ${fixedLines.length - 1}`);
  console.log(`   Added synthetic: ${addedCount}`);
  console.log(`   Removed excess: ${removedCount}\n`);
  
  // Step 8: Verify
  console.log('✅ Verifying aggregation matches datatoforecasts.csv...\n');
  
  const verifyMap = new Map();
  for (let i = 1; i < outputLines.length; i++) {
    const line = outputLines[i];
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    const dateStr = parts[0].trim();
    const barangay = parts[parts.length - 1].trim();
    
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const month = dateMatch[1].padStart(2, '0');
    const year = dateMatch[3];
    const yearMonth = `${year}-${month}`;
    const key = `${barangay}|${yearMonth}`;
    
    verifyMap.set(key, (verifyMap.get(key) || 0) + 1);
  }
  
  let perfectMatches = 0;
  let stillMismatched = 0;
  
  for (const [key, targetCount] of targetMap) {
    const verifyCount = verifyMap.get(key) || 0;
    if (verifyCount === targetCount) {
      perfectMatches++;
    } else {
      stillMismatched++;
      if (stillMismatched <= 5) {
        console.log(`   ⚠️  ${key}: target=${targetCount}, got=${verifyCount}`);
      }
    }
  }
  
  console.log('\n═'.repeat(80));
  console.log('📊 VERIFICATION RESULTS');
  console.log('═'.repeat(80));
  console.log(`✅ Perfect matches: ${perfectMatches}/${targetMap.size} (${(perfectMatches/targetMap.size*100).toFixed(1)}%)`);
  console.log(`❌ Still mismatched: ${stillMismatched}`);
  console.log('═'.repeat(80));
  
  if (perfectMatches === targetMap.size) {
    console.log('\n🎉 100% MATCH ACHIEVED!\n');
    console.log('You can now use mightbecorrectdata_complete.csv to populate historical_fires table.\n');
  } else {
    console.log('\n⚠️  Some mismatches remain. Running again might help.\n');
  }
}

fillMissingData();
