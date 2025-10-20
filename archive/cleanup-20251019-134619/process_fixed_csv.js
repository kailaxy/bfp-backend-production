const fs = require('fs');
const path = require('path');

function processFixedCSV() {
  try {
    console.log('🔍 Processing mightbecorrectdata_fixed.csv...\n');
    
    const csvPath = path.join(__dirname, '..', 'mightbecorrectdata_fixed.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`   ✅ Read ${lines.length} lines\n`);
    
    // Parse and aggregate
    console.log('📊 Aggregating data by barangay and month...\n');
    
    const aggregated = new Map();
    let skippedLines = 0;
    let processedRecords = 0;
    const barangays = new Set();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      
      // Date is first column
      const dateStr = parts[0].trim();
      
      // Barangay is last column
      const barangay = parts[parts.length - 1].trim();
      
      if (!barangay) {
        skippedLines++;
        continue;
      }
      
      // Parse date (MM/DD/YYYY format)
      const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      
      if (!dateMatch) {
        console.log(`⚠️  Skipping line ${i + 1}: Invalid date format: "${dateStr}"`);
        skippedLines++;
        continue;
      }
      
      const month = dateMatch[1].padStart(2, '0');
      const year = dateMatch[3];
      const yearMonth = `${year}-${month}`;
      
      barangays.add(barangay);
      
      // Aggregate
      const key = `${barangay}|${yearMonth}`;
      aggregated.set(key, (aggregated.get(key) || 0) + 1);
      processedRecords++;
    }
    
    console.log(`   ✅ Processed ${processedRecords} records`);
    console.log(`   ⚠️  Skipped ${skippedLines} records`);
    console.log(`   📊 Found ${barangays.size} unique barangays`);
    console.log(`   📊 Generated ${aggregated.size} aggregated records\n`);
    
    // Sort and write output
    const output = [['barangay_name', 'YYYY-MM', 'incident_count']];
    
    const sortedEntries = Array.from(aggregated.entries()).sort((a, b) => {
      const [barangayA, dateA] = a[0].split('|');
      const [barangayB, dateB] = b[0].split('|');
      
      if (barangayA !== barangayB) {
        return barangayA.localeCompare(barangayB);
      }
      return dateA.localeCompare(dateB);
    });
    
    for (const [key, count] of sortedEntries) {
      const [barangay, yearMonth] = key.split('|');
      output.push([barangay, yearMonth, count]);
    }
    
    const outputPath = path.join(__dirname, '..', 'processed_fixed_mightbecorrectdata.csv');
    const csvOutput = output.map(row => row.join(',')).join('\n');
    fs.writeFileSync(outputPath, csvOutput, 'utf-8');
    
    console.log(`💾 Saved to: processed_fixed_mightbecorrectdata.csv\n`);
    
    // Now compare with datatoforecasts.csv
    console.log('📊 Comparing with datatoforecasts.csv...\n');
    
    const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    const datatoforecastsContent = fs.readFileSync(datatoforecastsPath, 'utf-8');
    const datatoforecastsLines = datatoforecastsContent.split('\n').filter(line => line.trim()).slice(1); // Skip header
    
    const datatoforecastsMap = new Map();
    for (const line of datatoforecastsLines) {
      const [barangay, date, count] = line.split(',');
      const key = `${barangay}|${date}`;
      datatoforecastsMap.set(key, parseInt(count));
    }
    
    console.log(`   Datatoforecasts.csv: ${datatoforecastsMap.size} records`);
    console.log(`   Processed fixed data: ${aggregated.size} records\n`);
    
    // Compare
    let exactMatches = 0;
    let mismatches = 0;
    
    for (const [key, count] of aggregated) {
      if (datatoforecastsMap.has(key) && datatoforecastsMap.get(key) === count) {
        exactMatches++;
      } else if (datatoforecastsMap.has(key)) {
        mismatches++;
      }
    }
    
    const matchPercentage = ((exactMatches / aggregated.size) * 100).toFixed(1);
    
    console.log('═'.repeat(80));
    console.log('📊 COMPARISON RESULTS');
    console.log('═'.repeat(80));
    console.log(`✅ Exact matches: ${exactMatches} (${matchPercentage}% of processed data)`);
    console.log(`❌ Mismatches (different counts): ${mismatches}`);
    console.log(`⚠️  Only in datatoforecasts: ${datatoforecastsMap.size - exactMatches - mismatches}`);
    console.log(`⚠️  Only in processed: ${aggregated.size - exactMatches - mismatches}`);
    console.log('═'.repeat(80));
    
    if (exactMatches === aggregated.size && aggregated.size === datatoforecastsMap.size) {
      console.log('\n🎉 100% MATCH! The data is now identical!\n');
    } else {
      console.log(`\n📊 Match rate improved from 86.2% to ${matchPercentage}%\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

processFixedCSV();
