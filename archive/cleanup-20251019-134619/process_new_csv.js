const fs = require('fs');
const path = require('path');

function processNewCSV() {
  try {
    console.log('🔍 Processing mightbecorrectdata.csv...\n');
    
    // 1. Read the new CSV file
    console.log('📊 Step 1: Reading mightbecorrectdata.csv...');
    const newCsvPath = path.join(__dirname, '..', 'mightbecorrectdata.csv');
    
    if (!fs.existsSync(newCsvPath)) {
      console.error('❌ mightbecorrectdata.csv not found!');
      console.log('   Expected at:', newCsvPath);
      process.exit(1);
    }
    
    const newCsvContent = fs.readFileSync(newCsvPath, 'utf-8');
    const newLines = newCsvContent.split('\n').filter(line => line.trim());
    
    console.log(`   ✅ Read ${newLines.length} lines\n`);
    
    // Check the format - show first 5 lines
    console.log('📋 First 5 lines of mightbecorrectdata.csv:');
    console.log('─'.repeat(100));
    newLines.slice(0, 5).forEach((line, idx) => {
      console.log(`${idx + 1}: ${line}`);
    });
    console.log('─'.repeat(100));
    console.log('');
    
    // 2. Parse the CSV and detect format
    console.log('📊 Step 2: Detecting CSV format...\n');
    
    const firstLine = newLines[0];
    const parts = firstLine.split(',');
    console.log(`   Columns detected: ${parts.length}`);
    console.log(`   Sample parts:`, parts.slice(0, 5));
    console.log('');
    
    // Check if it has a header
    const hasHeader = isNaN(parseInt(parts[parts.length - 1]));
    console.log(`   Has header: ${hasHeader}`);
    console.log('');
    
    // 3. Aggregate data by barangay and month
    console.log('📊 Step 3: Aggregating data by barangay and month...\n');
    
    const aggregated = new Map(); // Map<barangay, Map<YYYY-MM, count>>
    let skippedLines = 0;
    let processedLines = 0;
    
    const dataLines = hasHeader ? newLines.slice(1) : newLines;
    
    dataLines.forEach((line, idx) => {
      try {
        const parts = line.split(',');
        
        // Try to find barangay and date columns
        // Common formats:
        // 1. barangay, date, count
        // 2. id, date, barangay, other_fields...
        // 3. date, barangay, count
        
        let barangay = null;
        let dateStr = null;
        
        // Look for date-like strings (various formats)
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          // Check if it looks like a date (YYYY-MM-DD, MM/DD/YYYY, etc.)
          if (part.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/) || 
              part.match(/\d{4}[-/]\d{1,2}/) ||
              part.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
            dateStr = part;
            break;
          }
        }
        
        // Barangay is in the last column (based on sample data)
        barangay = parts[parts.length - 1].trim().replace(/"/g, '');
        
        // Clean up barangay name
        if (barangay === 'BARANGAY' || barangay === 'Barangay' || !barangay) {
          skippedLines++;
          return;
        }
        
        if (!barangay || !dateStr) {
          skippedLines++;
          if (idx < 5) {
            console.log(`   ⚠️  Skipped line ${idx + 1}: Could not parse barangay or date`);
            console.log(`      Line: ${line.substring(0, 100)}...`);
          }
          return;
        }
        
        // Parse date to YYYY-MM format
        let monthKey;
        try {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          monthKey = `${year}-${month}`;
        } catch (e) {
          skippedLines++;
          return;
        }
        
        // Aggregate
        if (!aggregated.has(barangay)) {
          aggregated.set(barangay, new Map());
        }
        
        const barangayData = aggregated.get(barangay);
        const currentCount = barangayData.get(monthKey) || 0;
        barangayData.set(monthKey, currentCount + 1);
        
        processedLines++;
        
      } catch (error) {
        skippedLines++;
      }
    });
    
    console.log(`   ✅ Processed ${processedLines} records`);
    console.log(`   ⚠️  Skipped ${skippedLines} records`);
    console.log(`   📊 Found ${aggregated.size} unique barangays\n`);
    
    // 4. Write aggregated data to output file
    console.log('📊 Step 4: Writing aggregated data...\n');
    
    const outputLines = [];
    const barangays = Array.from(aggregated.keys()).sort();
    
    barangays.forEach(barangay => {
      const dates = aggregated.get(barangay);
      const sortedDates = Array.from(dates.keys()).sort();
      
      sortedDates.forEach(date => {
        const count = dates.get(date);
        outputLines.push(`${barangay},${date},${count}`);
      });
    });
    
    const outputPath = path.join(__dirname, '..', 'processed_mightbecorrectdata.csv');
    fs.writeFileSync(outputPath, outputLines.join('\n'));
    
    console.log(`   ✅ Written ${outputLines.length} records to processed_mightbecorrectdata.csv\n`);
    
    // 5. Show sample of processed data
    console.log('📋 Sample of processed data (first 10 records):');
    console.log('─'.repeat(80));
    console.log('Barangay'.padEnd(30) + 'Date'.padEnd(15) + 'Count');
    console.log('─'.repeat(80));
    outputLines.slice(0, 10).forEach(line => {
      const [barangay, date, count] = line.split(',');
      console.log(barangay.padEnd(30) + date.padEnd(15) + count);
    });
    console.log('─'.repeat(80));
    console.log('');
    
    // 6. Compare with datatoforecasts.csv
    console.log('📊 Step 5: Comparing with datatoforecasts.csv...\n');
    
    const datatoforecastsPath = path.join(__dirname, '..', 'datatoforecasts.csv');
    
    if (!fs.existsSync(datatoforecastsPath)) {
      console.log('   ⚠️  datatoforecasts.csv not found, skipping comparison');
      process.exit(0);
    }
    
    const dtfContent = fs.readFileSync(datatoforecastsPath, 'utf-8');
    const dtfLines = dtfContent.split('\n').filter(line => line.trim());
    
    // Parse datatoforecasts
    const dtfData = new Map();
    dtfLines.forEach(line => {
      const [barangay, date, count] = line.split(',');
      if (barangay && date && count) {
        const key = `${barangay.trim()},${date.trim()}`;
        dtfData.set(key, parseInt(count));
      }
    });
    
    // Parse processed data
    const processedData = new Map();
    outputLines.forEach(line => {
      const [barangay, date, count] = line.split(',');
      if (barangay && date && count) {
        const key = `${barangay.trim()},${date.trim()}`;
        processedData.set(key, parseInt(count));
      }
    });
    
    console.log(`   datatoforecasts.csv: ${dtfData.size} records`);
    console.log(`   processed data: ${processedData.size} records\n`);
    
    // Find differences
    let matches = 0;
    let mismatches = 0;
    let onlyInDtf = 0;
    let onlyInProcessed = 0;
    
    const mismatchDetails = [];
    
    // Check each record in datatoforecasts
    for (const [key, dtfCount] of dtfData) {
      if (processedData.has(key)) {
        const processedCount = processedData.get(key);
        if (dtfCount === processedCount) {
          matches++;
        } else {
          mismatches++;
          if (mismatchDetails.length < 20) {
            mismatchDetails.push({
              key,
              dtfCount,
              processedCount,
              diff: Math.abs(dtfCount - processedCount)
            });
          }
        }
      } else {
        onlyInDtf++;
      }
    }
    
    // Check records only in processed
    for (const key of processedData.keys()) {
      if (!dtfData.has(key)) {
        onlyInProcessed++;
      }
    }
    
    console.log('═'.repeat(100));
    console.log('COMPARISON RESULTS');
    console.log('═'.repeat(100));
    console.log(`\n   ✅ Exact matches: ${matches}`);
    console.log(`   ❌ Mismatches (different counts): ${mismatches}`);
    console.log(`   ⚠️  Only in datatoforecasts.csv: ${onlyInDtf}`);
    console.log(`   ⚠️  Only in processed data: ${onlyInProcessed}`);
    
    const total = Math.max(dtfData.size, processedData.size);
    const matchRate = (matches / total * 100).toFixed(1);
    console.log(`\n   📊 Match rate: ${matchRate}%\n`);
    
    if (mismatchDetails.length > 0) {
      console.log('─'.repeat(100));
      console.log('Sample of mismatches (first 20):');
      console.log('─'.repeat(100));
      console.log('Barangay, Date'.padEnd(50) + 'datatoforecasts'.padEnd(20) + 'processed'.padEnd(15) + 'Diff');
      console.log('─'.repeat(100));
      mismatchDetails.forEach(m => {
        console.log(
          m.key.padEnd(50) +
          String(m.dtfCount).padEnd(20) +
          String(m.processedCount).padEnd(15) +
          m.diff
        );
      });
      console.log('─'.repeat(100));
    }
    
    console.log('\n💡 CONCLUSION:\n');
    if (matchRate > 95) {
      console.log('   ✅ EXCELLENT! The processed data is very similar to datatoforecasts.csv');
      console.log('   The mightbecorrectdata.csv appears to be the correct source data!\n');
    } else if (matchRate > 80) {
      console.log('   ✅ GOOD! The processed data is mostly similar to datatoforecasts.csv');
      console.log('   There are some differences but they might be minor updates.\n');
    } else if (matchRate > 50) {
      console.log('   ⚠️  MODERATE: The data is somewhat similar but has notable differences.');
      console.log('   May need to investigate the discrepancies.\n');
    } else {
      console.log('   ❌ DIFFERENT: The data appears to be from different sources or time periods.\n');
    }
    
    console.log(`✅ Output saved to: ${outputPath}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

processNewCSV();
